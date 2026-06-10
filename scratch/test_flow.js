"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// scratch/test_flow.ts
const supabase_1 = require("../lib/supabase");
// 1. Mock browser environment
const storage = {};
const mockLocalStorage = {
    getItem: (key) => storage[key] || null,
    setItem: (key, value) => { storage[key] = value; },
    removeItem: (key) => { delete storage[key]; },
    clear: () => { for (const k in storage)
        delete storage[k]; },
    length: 0,
    key: (index) => null
};
if (typeof global.window === 'undefined') {
    global.window = {};
}
if (typeof global.localStorage === 'undefined') {
    global.localStorage = mockLocalStorage;
}
// Ensure Web Crypto is available in Node.js
if (typeof global.crypto === 'undefined' || !global.crypto.subtle) {
    const { webcrypto } = require('crypto');
    global.crypto = webcrypto;
}
async function runSimulation() {
    console.log('--- STARTING REGISTRATION SIMULATION ---');
    console.log('Simulating registration for a 3rd Year CSE student...');
    const studentData = {
        name: 'Vikas Gupta',
        email: 'vikas.gupta@vit.edu',
        college: 'VIT Vellore',
        branch: 'CSE',
        year: '3rd Year',
        workstyle: 'pro_dev',
        priority: 'high_growth_gcc',
        skills: ['c', 'html', 'java', 'db'],
        referredByCode: 'TB-AMIT-101' // Simulating signed up via referral
    };
    const password = 'securepassword123';
    // Pre-seed the referrer in mock localStorage to test referral crediting
    const mockReferrer = {
        name: 'Amit Sharma',
        email: 'amit.sharma@vit.edu',
        college: 'VIT Vellore',
        branch: 'CSE',
        year: '4th Year',
        workstyle: 'pro_dev',
        priority: 'high_paying',
        skills: ['c', 'html', 'java', 'db'],
        createdAt: new Date().toISOString(),
        referralCode: 'TB-AMIT-101',
        referralProDays: 0
    };
    localStorage.setItem('tb_registered_profiles', JSON.stringify([mockReferrer]));
    console.log('\n[Flow 1] Registering student...');
    const profile = await (0, supabase_1.registerStudent)(studentData, password);
    if (profile) {
        console.log('SUCCESS! Profile registered successfully.');
        console.log('Generated Profile Details:', JSON.stringify(profile, null, 2));
        // Check local storage for updated referrer
        const localProfiles = JSON.parse(localStorage.getItem('tb_registered_profiles') || '[]');
        const updatedReferrer = localProfiles.find((p) => p.referralCode === 'TB-AMIT-101');
        console.log('\n[Referrals] Checking if Amit (Referrer) was credited with +7 Pro days:');
        console.log(`Amit's Pro Days: ${updatedReferrer?.referralProDays} (Expected: 7)`);
        console.log('\n[Referrals] Checking if Vikas (Referee) received +7 Pro days:');
        console.log(`Vikas's Pro Days: ${profile.referralProDays} (Expected: 7)`);
    }
    else {
        console.log('ERROR: Registration failed.');
        return;
    }
    console.log('\n[Flow 2] Simulating login with the newly created account...');
    const loggedProfile = await (0, supabase_1.authenticateStudent)(studentData.email, password);
    if (loggedProfile) {
        console.log('SUCCESS! Authenticated student successfully.');
        console.log('Password hash verified.');
    }
    else {
        console.log('ERROR: Authentication failed.');
    }
    console.log('\n--- SIMULATION COMPLETED SUCCESSFULLY ---');
}
runSimulation().catch(err => {
    console.error('Simulation exception:', err);
});
