import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/db';
import { User } from '@/models/User';
import { signToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const { email, password, firstName, lastName, role, tenantId } = await request.json();

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'Email already exists' }, { status: 400 });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Default to general_user if role is not provided or invalid
    let assignedRole = 'general_user';
    if (['super_admin', 'hospital_admin', 'general_user'].includes(role)) {
      assignedRole = role;
    }

    // Create user
    const newUser = new User({
      email,
      passwordHash,
      firstName,
      lastName,
      role: assignedRole,
      tenantId: assignedRole === 'hospital_admin' ? tenantId : undefined,
    });

    await newUser.save();

    // Generate token
    const token = signToken({
      userId: newUser._id.toString(),
      role: newUser.role as any,
      tenantId: newUser.tenantId?.toString()
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: newUser._id,
        email: newUser.email,
        role: newUser.role,
        firstName: newUser.firstName,
        lastName: newUser.lastName
      }
    });

    // Set HTTP-only cookie
    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 day
    });

    return response;
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
