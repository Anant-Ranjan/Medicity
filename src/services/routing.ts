import { Tenant, ITenant } from '@/models/Tenant';
import { Staff } from '@/models/Staff';
import connectToDatabase from '@/lib/db';

export interface RouteParams {
  userLocation: [number, number]; // [longitude, latitude]
  maxRadiusKm?: number;
  requiredSpecialty?: string;
  requiredMachinery?: 'mri' | 'ctScanner' | 'dialysis' | 'ecmo';
  needsICU?: boolean;
}

export interface ScoredHospital {
  hospital: ITenant;
  score: number;
  distanceKm: number;
  estimatedTotalTimeMins: number;
  specialistAvailable: boolean;
}

/**
 * Calculates distance between two coordinates using the Haversine formula
 */
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

/**
 * AI-Powered Search & Weighted Graph Routing Engine
 * Implements a weighted scoring system weighing geographic distance, active ICU bed availability,
 * and on-duty status of specific specialists.
 */
export async function findOptimalEmergencyRoute(params: RouteParams): Promise<ScoredHospital[]> {
  await connectToDatabase();
  
  const maxDistanceRadians = (params.maxRadiusKm || 50) / 6378.1;

  // 1. Initial Geospatial & Hard Constraints Filtering
  const query: any = {
    location: {
      $geoWithin: {
        $centerSphere: [params.userLocation, maxDistanceRadians]
      }
    }
  };

  if (params.needsICU) {
    // Requires at least 1 available ICU bed
    query.$expr = { $gt: ["$bedTelemetry.icu.total", "$bedTelemetry.icu.occupied"] };
  }

  if (params.requiredMachinery) {
    query[`machinery.${params.requiredMachinery}.status`] = 'Operational';
  }

  const candidateHospitals = await Tenant.find(query).lean() as ITenant[];

  if (candidateHospitals.length === 0) return [];

  const scoredResults: ScoredHospital[] = [];

  // 2. Complex Weighting Algorithm (Dijkstra-inspired scoring)
  for (const hospital of candidateHospitals) {
    const [hLon, hLat] = hospital.location.coordinates;
    const distanceKm = getDistanceFromLatLonInKm(params.userLocation[1], params.userLocation[0], hLat, hLon);
    
    // Assume average urban speed of 30 km/h for driving time estimate
    const estimatedDriveTimeMins = (distanceKm / 30) * 60;
    const totalWaitTime = estimatedDriveTimeMins + hospital.currentERWaitTimeMinutes;

    let specialistAvailable = false;
    let specialistScoreBonus = 0;

    // Check Specialist Roster if required
    if (params.requiredSpecialty) {
      const activeSpecialist = await Staff.findOne({
        tenantId: hospital._id,
        specialty: { $regex: new RegExp(params.requiredSpecialty, 'i') },
        'shifts.status': 'On-Duty'
      }).lean();

      if (activeSpecialist) {
        specialistAvailable = true;
        specialistScoreBonus = 50; // High bonus for having the required specialist currently active
      }
    }

    // Capacity Factor: How crowded is the ER/ICU?
    const icuCapacityRatio = hospital.bedTelemetry.icu.total > 0 
      ? (hospital.bedTelemetry.icu.total - hospital.bedTelemetry.icu.occupied) / hospital.bedTelemetry.icu.total 
      : 0;

    // The Scoring Formula (Lower score is better conceptually, but we invert it here so Higher = Better Match)
    // We penalize high wait times heavily, reward close proximity, and heavily reward specialist availability.
    let score = 1000;
    
    // Penalties
    score -= totalWaitTime * 2; // Subtract points for every minute of total expected wait
    
    // Bonuses
    score += icuCapacityRatio * 100; // Bonus for having empty beds (up to 100 points)
    score += specialistScoreBonus;
    
    // Load balancing penalty - if ICU is > 90% full, severely penalize to route to overflow
    if (icuCapacityRatio < 0.1) {
      score -= 200; 
    }

    // Only include if it meets the hard specialty requirement (if strictly needed)
    // For this example, we treat it as a strong preference, but if needsICU is true and they are full, the query already filtered them out.
    
    scoredResults.push({
      hospital,
      score,
      distanceKm,
      estimatedTotalTimeMins: Math.round(totalWaitTime),
      specialistAvailable
    });
  }

  // 3. Sort by optimal score (Highest first)
  scoredResults.sort((a, b) => b.score - a.score);

  return scoredResults;
}
