import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../src/models/User.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@videomanch.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AdminPass123!';

async function seedAdmin() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is required');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected successfully');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });

    if (existingAdmin) {
      if (existingAdmin.userType === 'admin') {
        console.log(`Admin user already exists: ${ADMIN_EMAIL}`);
      } else {
        // Upgrade existing user to admin
        existingAdmin.userType = 'admin';
        await existingAdmin.save();
        console.log(`Upgraded existing user to admin: ${ADMIN_EMAIL}`);
      }
    } else {
      // Create new admin user
      const adminUser = new User({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        userType: 'admin',
      });
      await adminUser.save();
      console.log(`Created admin user: ${ADMIN_EMAIL}`);
    }

    console.log('\nAdmin seed completed successfully!');
    console.log('You can now login with:');
    console.log(`  Email: ${ADMIN_EMAIL}`);
    console.log(`  Password: ${ADMIN_PASSWORD}`);
    console.log('\nIMPORTANT: Change this password after first login!');
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedAdmin();
