"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MOCK_CORPORATE_SKILLS = exports.supabase = void 0;
exports.isSupabaseConfigured = isSupabaseConfigured;
exports.saveProfile = saveProfile;
exports.getProfile = getProfile;
exports.getAllProfiles = getAllProfiles;
exports.getCorporateSkills = getCorporateSkills;
exports.saveCorporateSkills = saveCorporateSkills;
exports.getSupabasePlaybooks = getSupabasePlaybooks;
exports.saveSupabasePlaybook = saveSupabasePlaybook;
exports.getSupabasePosts = getSupabasePosts;
exports.saveSupabasePost = saveSupabasePost;
exports.saveSupabaseComment = saveSupabaseComment;
exports.likeSupabasePost = likeSupabasePost;
exports.getSupabaseDMs = getSupabaseDMs;
exports.saveSupabaseDM = saveSupabaseDM;
exports.hashPassword = hashPassword;
exports.authenticateStudent = authenticateStudent;
exports.registerStudent = registerStudent;
exports.getReferralStats = getReferralStats;
// lib/supabase.ts
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
exports.supabase = (supabaseUrl && supabaseAnonKey)
    ? (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey)
    : null;
function isSupabaseConfigured() {
    return exports.supabase !== null;
}
// Rich high-fidelity mock registrations to populate the Admin Dashboard out-of-the-box
const MOCK_PROFILES = [
    {
        name: 'Amit Sharma',
        email: 'amit.sharma@vit.edu',
        college: 'VIT Vellore',
        branch: 'CSE',
        year: '4th Year',
        workstyle: 'pro_dev',
        priority: 'high_paying',
        skills: ['c', 'html', 'java', 'db'],
        createdAt: '2026-06-06T10:15:00.000Z'
    },
    {
        name: 'Priya Nair',
        email: 'priya.nair@cet.ac.in',
        college: 'CET Trivandrum',
        branch: 'MECH',
        year: '4th Year',
        workstyle: 'design',
        priority: 'fast_hire',
        skills: ['c', 'cad2d'],
        createdAt: '2026-06-06T09:30:00.000Z'
    },
    {
        name: 'Karthik N',
        email: 'karthik.n@nitt.edu',
        college: 'NIT Trichy',
        branch: 'ECE',
        year: '4th Year',
        workstyle: 'embedded',
        priority: 'high_paying',
        skills: ['c', 'circuits'],
        createdAt: '2026-06-06T08:12:00.000Z'
    },
    {
        name: 'Rohan Das',
        email: 'rohan.das@bits-pilani.ac.in',
        college: 'BITS Pilani',
        branch: 'CSE',
        year: '3rd Year',
        workstyle: 'pro_dev',
        priority: 'high_paying',
        skills: ['c', 'java', 'db'],
        createdAt: '2026-06-05T16:24:00.000Z'
    },
    {
        name: 'Sneha Reddy',
        email: 'sneha.reddy@rvce.edu.in',
        college: 'RVCE Bangalore',
        branch: 'IT',
        year: '3rd Year',
        workstyle: 'pro_dev',
        priority: 'stable_mnc',
        skills: ['html', 'java', 'db'],
        createdAt: '2026-06-05T14:10:00.000Z'
    },
    {
        name: 'Ananya Sen',
        email: 'ananya.sen@jadavpur.edu',
        college: 'Jadavpur University',
        branch: 'CIVIL',
        year: '4th Year',
        workstyle: 'infra',
        priority: 'stable_mnc',
        skills: ['cad2d'],
        createdAt: '2026-06-05T11:45:00.000Z'
    },
    {
        name: 'Vikram Malhotra',
        email: 'vikram.m@dtu.ac.in',
        college: 'DTU Delhi',
        branch: 'MCA',
        year: '2nd Year',
        workstyle: 'pro_dev',
        priority: 'high_paying',
        skills: ['c', 'java', 'db'],
        createdAt: '2026-06-04T18:30:00.000Z'
    },
    {
        name: 'Pooja Patel',
        email: 'pooja.p@nirma.ac.in',
        college: 'Nirma University',
        branch: 'BCA',
        year: '3rd Year',
        workstyle: 'low_code',
        priority: 'fast_hire',
        skills: ['html', 'db'],
        createdAt: '2026-06-04T15:20:00.000Z'
    },
    {
        name: 'Sandeep Rao',
        email: 'sandeep.r@pes.edu',
        college: 'PES University',
        branch: 'CSE',
        year: '2nd Year',
        workstyle: 'ai_data',
        priority: 'high_paying',
        skills: ['c', 'java'],
        createdAt: '2026-06-04T10:05:00.000Z'
    },
    {
        name: 'Divya Joshi',
        email: 'divya.j@coep.org.in',
        college: 'COEP Pune',
        branch: 'ECE',
        year: '4th Year',
        workstyle: 'embedded',
        priority: 'stable_mnc',
        skills: ['c', 'circuits'],
        createdAt: '2026-06-03T16:40:00.000Z'
    },
    {
        name: 'Arjun Verma',
        email: 'arjun.v@psgtech.edu',
        college: 'PSG Tech Coimbatore',
        branch: 'MECH',
        year: '3rd Year',
        workstyle: 'design',
        priority: 'fast_hire',
        skills: ['cad2d'],
        createdAt: '2026-06-03T14:15:00.000Z'
    },
    {
        name: 'Meera Nair',
        email: 'meera.n@amrita.edu',
        college: 'Amrita Coimbatore',
        branch: 'IT',
        year: '4th Year',
        workstyle: 'automation',
        priority: 'stable_mnc',
        skills: ['c', 'html', 'db'],
        createdAt: '2026-06-03T09:50:00.000Z'
    }
];
// Fetch profiles from localStorage (fallback database)
function getLocalProfiles() {
    if (typeof window === 'undefined')
        return [];
    try {
        const list = localStorage.getItem('tb_registered_profiles');
        return list ? JSON.parse(list) : [];
    }
    catch (e) {
        return [];
    }
}
// Add profile to localStorage (fallback database)
function saveLocalProfile(profile) {
    if (typeof window === 'undefined')
        return;
    try {
        const list = getLocalProfiles();
        const index = list.findIndex(p => p.email.toLowerCase() === profile.email.toLowerCase());
        if (index > -1) {
            list[index] = profile;
        }
        else {
            list.unshift(profile);
        }
        localStorage.setItem('tb_registered_profiles', JSON.stringify(list));
    }
    catch (e) { }
}
async function saveProfile(profile) {
    const fullProfile = {
        ...profile,
        createdAt: new Date().toISOString()
    };
    // Save to client storage (acts as cache & fallback)
    saveLocalProfile(fullProfile);
    if (exports.supabase) {
        try {
            const { error } = await exports.supabase
                .from('student_profiles')
                .upsert({
                email: fullProfile.email.toLowerCase(),
                name: fullProfile.name,
                college: fullProfile.college,
                branch: fullProfile.branch,
                year: fullProfile.year,
                workstyle: fullProfile.workstyle,
                priority: fullProfile.priority,
                skills: fullProfile.skills,
                created_at: fullProfile.createdAt
            }, { onConflict: 'email' });
            if (error) {
                console.error('Supabase upsert error:', error);
                return false;
            }
            return true;
        }
        catch (err) {
            console.error('Supabase query exception:', err);
            return false;
        }
    }
    // Successful save in local fallback mode
    return true;
}
async function getProfile(email) {
    const emailLower = email.toLowerCase();
    // 1. Try local list cache
    const localList = getLocalProfiles();
    const localProf = localList.find(p => p.email.toLowerCase() === emailLower);
    if (localProf)
        return localProf;
    // 2. Try mock seed records (for convenient testing of logged accounts)
    const mockProf = MOCK_PROFILES.find(p => p.email.toLowerCase() === emailLower);
    if (mockProf)
        return mockProf;
    // 3. Try live Supabase connection
    if (exports.supabase) {
        try {
            const { data, error } = await exports.supabase
                .from('student_profiles')
                .select('*')
                .eq('email', emailLower)
                .single();
            if (error || !data)
                return null;
            const mapped = {
                name: data.name,
                email: data.email,
                college: data.college,
                branch: data.branch,
                year: data.year,
                workstyle: data.workstyle,
                priority: data.priority,
                skills: Array.isArray(data.skills) ? data.skills : [],
                createdAt: data.created_at,
                passwordHash: data.password_hash,
                referralCode: data.referral_code,
                referredByCode: data.referred_by_code,
                isPremium: data.is_premium || false,
                referralProDays: data.referral_pro_days || 0
            };
            return mapped;
        }
        catch (err) {
            return null;
        }
    }
    return null;
}
async function getAllProfiles() {
    // If Supabase is active, fetch live data
    if (exports.supabase) {
        try {
            const { data, error } = await exports.supabase
                .from('student_profiles')
                .select('*')
                .order('created_at', { ascending: false });
            if (!error && data) {
                // Map database records
                const dbProfiles = data.map((item) => ({
                    name: item.name,
                    email: item.email,
                    college: item.college,
                    branch: item.branch,
                    year: item.year,
                    workstyle: item.workstyle,
                    priority: item.priority,
                    skills: Array.isArray(item.skills) ? item.skills : [],
                    createdAt: item.created_at,
                    passwordHash: item.password_hash,
                    referralCode: item.referral_code,
                    referredByCode: item.referred_by_code,
                    isPremium: item.is_premium || false,
                    referralProDays: item.referral_pro_days || 0
                }));
                // Combine DB profiles with Mock seeds to ensure a rich dashboard representation
                const combined = [...dbProfiles];
                MOCK_PROFILES.forEach(mock => {
                    if (!combined.some(p => p.email.toLowerCase() === mock.email.toLowerCase())) {
                        combined.push(mock);
                    }
                });
                return combined;
            }
        }
        catch (err) {
            console.error('Failed to fetch from Supabase, returning local & mock:', err);
        }
    }
    // Fallback: Combine local profiles created in sandbox + seed mock profiles
    const localList = getLocalProfiles();
    const combined = [...localList];
    MOCK_PROFILES.forEach(mock => {
        if (!combined.some(p => p.email.toLowerCase() === mock.email.toLowerCase())) {
            combined.push(mock);
        }
    });
    // Sort by date descending
    return combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
exports.MOCK_CORPORATE_SKILLS = [
    { id: 'aws_bedrock', name: 'AWS Bedrock APIs', category: 'Cloud AI / GenAI', demand: 96, companies: ['Amazon', 'Accenture', 'TCS'], lastCrawled: new Date().toISOString() },
    { id: 'mulesoft_dw', name: 'MuleSoft DataWeave', category: 'Integration Platforms', demand: 92, companies: ['Salesforce', 'Deloitte', 'Capgemini'], lastCrawled: new Date().toISOString() },
    { id: 'servicenow_csa', name: 'ServiceNow Workflows', category: 'Enterprise Platforms', demand: 89, companies: ['Accenture', 'Deloitte', 'Infosys'], lastCrawled: new Date().toISOString() },
    { id: 'salesforce_apex', name: 'Salesforce Apex Dev', category: 'CRM & ERP', demand: 91, companies: ['Salesforce', 'Cognizant', 'Persistent'], lastCrawled: new Date().toISOString() },
    { id: 'uipath_studio', name: 'UiPath RPA Studio', category: 'RPA & Automation', demand: 87, companies: ['TCS Digital', 'Infosys BPM', 'Wipro'], lastCrawled: new Date().toISOString() },
    { id: 'vector_canalyzer', name: 'Vector CANalyzer', category: 'Automotive Electronics', demand: 94, companies: ['Ather Energy', 'Ola Electric', 'Bosch'], lastCrawled: new Date().toISOString() },
    { id: 'ansys_fea', name: 'Ansys FEA Solver', category: 'Simulation & FEA', demand: 85, companies: ['Tata Motors', 'Mahindra', 'HAL'], lastCrawled: new Date().toISOString() },
    { id: 'revit_bim', name: 'Autodesk Revit BIM', category: 'BIM & Design', demand: 88, companies: ['L&T Construction', 'Shapoorji', 'DLF'], lastCrawled: new Date().toISOString() },
    { id: 'snowflake_dw', name: 'Snowflake Analytics', category: 'Data & Analytics', demand: 86, companies: ['Deloitte', 'PwC', 'KPMG'], lastCrawled: new Date().toISOString() },
    { id: 'staad_pro', name: 'STAAD.Pro Concrete', category: 'Structural Analysis', demand: 80, companies: ['L&T Construction', 'Gammon India', 'AECOM'], lastCrawled: new Date().toISOString() },
    { id: 'boomi_flow', name: 'Dell Boomi Flow', category: 'Integration Platforms', demand: 83, companies: ['Dell Technologies', 'IBM', 'Accenture'], lastCrawled: new Date().toISOString() },
    { id: 'shopify_dev', name: 'Shopify Partners', category: 'Web & eCommerce', demand: 82, companies: ['Digital agencies', 'D2C startups', 'startups'], lastCrawled: new Date().toISOString() }
];
function getLocalCorporateSkills() {
    if (typeof window === 'undefined')
        return [];
    try {
        const data = localStorage.getItem('tb_corporate_skills');
        return data ? JSON.parse(data) : [];
    }
    catch (e) {
        return [];
    }
}
function saveLocalCorporateSkills(skills) {
    if (typeof window === 'undefined')
        return;
    try {
        localStorage.setItem('tb_corporate_skills', JSON.stringify(skills));
    }
    catch (e) { }
}
async function getCorporateSkills() {
    // If Supabase is active, fetch from it
    if (exports.supabase) {
        try {
            const { data, error } = await exports.supabase
                .from('corporate_skills')
                .select('*')
                .order('demand', { ascending: false });
            if (!error && data && data.length > 0) {
                return data.map((item) => ({
                    id: item.id,
                    name: item.name,
                    category: item.category,
                    demand: item.demand,
                    companies: Array.isArray(item.companies) ? item.companies : [],
                    lastCrawled: item.last_crawled
                }));
            }
        }
        catch (err) {
            console.error('Failed to fetch corporate skills from Supabase:', err);
        }
    }
    // Fallback: localStorage
    const localList = getLocalCorporateSkills();
    if (localList.length > 0) {
        return localList;
    }
    // Initial Seed
    saveLocalCorporateSkills(exports.MOCK_CORPORATE_SKILLS);
    return exports.MOCK_CORPORATE_SKILLS;
}
async function saveCorporateSkills(skills) {
    // Save locally
    saveLocalCorporateSkills(skills);
    if (exports.supabase) {
        try {
            // Upsert all skills
            const rows = skills.map(s => ({
                id: s.id,
                name: s.name,
                category: s.category,
                demand: s.demand,
                companies: s.companies,
                last_crawled: s.lastCrawled
            }));
            const { error } = await exports.supabase
                .from('corporate_skills')
                .upsert(rows);
            if (error) {
                console.error('Supabase corporate skills upsert error:', error);
                return false;
            }
            return true;
        }
        catch (err) {
            console.error('Supabase corporate skills exception:', err);
            return false;
        }
    }
    return true;
}
async function getSupabasePlaybooks() {
    if (!exports.supabase)
        return [];
    try {
        const { data, error } = await exports.supabase
            .from('playbooks')
            .select('*')
            .order('created_at', { ascending: false });
        if (error || !data)
            return [];
        return data.map((item) => ({
            id: item.id,
            studentName: item.student_name,
            branch: item.branch,
            college: item.college,
            year: item.year,
            company: item.company,
            role: item.role,
            salary: item.salary,
            status: item.status,
            difficulty: item.difficulty,
            tags: Array.isArray(item.tags) ? item.tags : [],
            summary: item.summary,
            rounds: Array.isArray(item.rounds) ? item.rounds : [],
            verified: item.verified,
            createdAt: item.created_at
        }));
    }
    catch (err) {
        console.error('getSupabasePlaybooks error:', err);
        return [];
    }
}
async function saveSupabasePlaybook(p) {
    if (!exports.supabase)
        return false;
    try {
        const { error } = await exports.supabase
            .from('playbooks')
            .insert({
            student_name: p.studentName,
            branch: p.branch,
            college: p.college,
            year: p.year,
            company: p.company,
            role: p.role,
            salary: p.salary,
            status: p.status,
            difficulty: p.difficulty,
            tags: p.tags,
            summary: p.summary,
            rounds: p.rounds,
            verified: p.verified
        });
        if (error) {
            console.error('saveSupabasePlaybook error:', error);
            return false;
        }
        return true;
    }
    catch (err) {
        console.error('saveSupabasePlaybook exception:', err);
        return false;
    }
}
async function getSupabasePosts() {
    if (!exports.supabase)
        return [];
    try {
        const { data, error } = await exports.supabase
            .from('community_posts')
            .select('*, community_comments(*)')
            .order('created_at', { ascending: false });
        if (error || !data)
            return [];
        return data.map((item) => ({
            id: item.id,
            userName: item.user_name,
            branch: item.branch,
            college: item.college,
            year: item.year,
            avatar: item.avatar,
            color: item.color,
            content: item.content,
            tags: Array.isArray(item.tags) ? item.tags : [],
            likes: item.likes || 0,
            comments: Array.isArray(item.community_comments)
                ? item.community_comments.map((c) => ({
                    id: c.id,
                    postId: c.post_id,
                    userName: c.user_name,
                    avatar: c.avatar,
                    color: c.color,
                    text: c.text,
                    createdAt: c.created_at
                }))
                : [],
            createdAt: item.created_at
        }));
    }
    catch (err) {
        console.error('getSupabasePosts error:', err);
        return [];
    }
}
async function saveSupabasePost(p) {
    if (!exports.supabase)
        return false;
    try {
        const { error } = await exports.supabase
            .from('community_posts')
            .insert({
            user_name: p.userName,
            branch: p.branch,
            college: p.college,
            year: p.year,
            avatar: p.avatar,
            color: p.color,
            content: p.content,
            tags: p.tags,
            likes: 0
        });
        if (error) {
            console.error('saveSupabasePost error:', error);
            return false;
        }
        return true;
    }
    catch (err) {
        console.error('saveSupabasePost exception:', err);
        return false;
    }
}
async function saveSupabaseComment(c) {
    if (!exports.supabase)
        return false;
    try {
        const { error } = await exports.supabase
            .from('community_comments')
            .insert({
            post_id: c.postId,
            user_name: c.userName,
            avatar: c.avatar,
            color: c.color,
            text: c.text
        });
        if (error) {
            console.error('saveSupabaseComment error:', error);
            return false;
        }
        return true;
    }
    catch (err) {
        console.error('saveSupabaseComment exception:', err);
        return false;
    }
}
async function likeSupabasePost(postId, likesCount) {
    if (!exports.supabase)
        return false;
    try {
        const { error } = await exports.supabase
            .from('community_posts')
            .update({ likes: likesCount })
            .eq('id', postId);
        if (error) {
            console.error('likeSupabasePost error:', error);
            return false;
        }
        return true;
    }
    catch (err) {
        console.error('likeSupabasePost exception:', err);
        return false;
    }
}
async function getSupabaseDMs(studentEmail) {
    if (!exports.supabase)
        return [];
    try {
        const { data, error } = await exports.supabase
            .from('direct_messages')
            .select('*')
            .eq('student_email', studentEmail.toLowerCase())
            .order('created_at', { ascending: true });
        if (error || !data)
            return [];
        return data.map((item) => ({
            id: item.id,
            studentEmail: item.student_email,
            partnerName: item.partner_name,
            me: item.me,
            text: item.text,
            createdAt: item.created_at
        }));
    }
    catch (err) {
        console.error('getSupabaseDMs error:', err);
        return [];
    }
}
async function saveSupabaseDM(dm) {
    if (!exports.supabase)
        return false;
    try {
        const { error } = await exports.supabase
            .from('direct_messages')
            .insert({
            student_email: dm.studentEmail.toLowerCase(),
            partner_name: dm.partnerName,
            me: dm.me,
            text: dm.text
        });
        if (error) {
            console.error('saveSupabaseDM error:', error);
            return false;
        }
        return true;
    }
    catch (err) {
        console.error('saveSupabaseDM exception:', err);
        return false;
    }
}
// Helper to hash passwords using SHA-256 (compatible with client & server)
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
// Map database row to StudentProfile object
function mapDbProfile(item) {
    return {
        name: item.name,
        email: item.email,
        college: item.college,
        branch: item.branch,
        year: item.year,
        workstyle: item.workstyle,
        priority: item.priority,
        skills: Array.isArray(item.skills) ? item.skills : [],
        createdAt: item.created_at,
        passwordHash: item.password_hash,
        referralCode: item.referral_code,
        referredByCode: item.referred_by_code,
        isPremium: item.is_premium || false,
        referralProDays: item.referral_pro_days || 0
    };
}
async function authenticateStudent(email, passwordPlain) {
    const emailLower = email.toLowerCase().trim();
    const hash = await hashPassword(passwordPlain);
    if (exports.supabase) {
        try {
            const { data, error } = await exports.supabase
                .from('student_profiles')
                .select('*')
                .eq('email', emailLower)
                .single();
            if (error || !data)
                return null;
            const profile = mapDbProfile(data);
            if (profile.passwordHash === hash) {
                return profile;
            }
            return null;
        }
        catch (e) {
            console.error('authenticateStudent Supabase error:', e);
        }
    }
    // Fallback: LocalStorage
    const localList = getLocalProfiles();
    const localProf = localList.find(p => p.email.toLowerCase() === emailLower);
    if (localProf && localProf.passwordHash === hash) {
        return localProf;
    }
    // Fallback: Check Mock profiles (simulated login with any password for easy testing)
    const mockProf = MOCK_PROFILES.find(p => p.email.toLowerCase() === emailLower);
    if (mockProf) {
        return {
            ...mockProf,
            passwordHash: hash, // accept any password for seed testing
            referralCode: `TB-${mockProf.name.split(' ')[0].toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
            referralProDays: 14 // give mock accounts some Pro days
        };
    }
    return null;
}
async function registerStudent(p, passwordPlain) {
    const emailLower = p.email.toLowerCase().trim();
    const hash = await hashPassword(passwordPlain);
    // Generate unique referral code
    const cleanName = p.name.replace(/[^a-zA-Z]/g, '').toUpperCase();
    const codeName = cleanName.substring(0, 7) || 'STUDENT';
    const randomNum = Math.floor(100 + Math.random() * 900);
    const myRefCode = `TB-${codeName}-${randomNum}`;
    let proDays = 0;
    let referredByCodeClean = p.referredByCode?.trim().toUpperCase() || undefined;
    // If there's a referral code, credit both users
    if (referredByCodeClean) {
        proDays = 7; // Referee gets 7 days of Pro access
        // Update Referrer (giver) in background / DB
        if (exports.supabase) {
            try {
                // Find referrer profile
                const { data: referrer, error } = await exports.supabase
                    .from('student_profiles')
                    .select('*')
                    .eq('referral_code', referredByCodeClean)
                    .single();
                if (!error && referrer) {
                    const newProDays = (referrer.referral_pro_days || 0) + 7;
                    await exports.supabase
                        .from('student_profiles')
                        .update({ referral_pro_days: newProDays })
                        .eq('email', referrer.email);
                }
                else {
                    // invalid code
                    referredByCodeClean = undefined;
                    proDays = 0;
                }
            }
            catch (e) {
                console.error('Failed to credit referrer in Supabase:', e);
            }
        }
        else {
            // Offline fallback: update referrer in localStorage
            const localList = getLocalProfiles();
            const idx = localList.findIndex(prof => prof.referralCode === referredByCodeClean);
            if (idx > -1) {
                localList[idx].referralProDays = (localList[idx].referralProDays || 0) + 7;
                localStorage.setItem('tb_registered_profiles', JSON.stringify(localList));
            }
            else {
                referredByCodeClean = undefined;
                proDays = 0;
            }
        }
    }
    const newProfile = {
        ...p,
        email: emailLower,
        passwordHash: hash,
        referralCode: myRefCode,
        referredByCode: referredByCodeClean,
        referralProDays: proDays,
        isPremium: false,
        createdAt: new Date().toISOString()
    };
    // Save local fallback
    saveLocalProfile(newProfile);
    // Save to Supabase
    if (exports.supabase) {
        try {
            const { error } = await exports.supabase
                .from('student_profiles')
                .upsert({
                email: newProfile.email,
                name: newProfile.name,
                college: newProfile.college,
                branch: newProfile.branch,
                year: newProfile.year,
                workstyle: newProfile.workstyle,
                priority: newProfile.priority,
                skills: newProfile.skills,
                password_hash: newProfile.passwordHash,
                referral_code: newProfile.referralCode,
                referred_by_code: newProfile.referredByCode,
                referral_pro_days: newProfile.referralProDays,
                is_premium: newProfile.isPremium,
                created_at: newProfile.createdAt
            }, { onConflict: 'email' });
            if (error) {
                console.error('registerStudent Supabase error:', error);
                return null;
            }
        }
        catch (err) {
            console.error('registerStudent exception:', err);
            return null;
        }
    }
    return newProfile;
}
async function getReferralStats(email, referralCode) {
    if (exports.supabase) {
        try {
            // Count students referred by this user
            const { count, error } = await exports.supabase
                .from('student_profiles')
                .select('*', { count: 'exact', head: true })
                .eq('referred_by_code', referralCode);
            // Fetch user's current referral_pro_days
            const { data: user, error: userErr } = await exports.supabase
                .from('student_profiles')
                .select('referral_pro_days')
                .eq('email', email.toLowerCase().trim())
                .single();
            if (!error && !userErr && user) {
                return {
                    count: count || 0,
                    proDays: user.referral_pro_days || 0
                };
            }
        }
        catch (e) {
            console.error('getReferralStats Supabase error:', e);
        }
    }
    // Fallback: LocalStorage
    const localList = getLocalProfiles();
    const referredList = localList.filter(p => p.referredByCode === referralCode);
    const self = localList.find(p => p.email.toLowerCase() === email.toLowerCase().trim());
    return {
        count: referredList.length,
        proDays: self?.referralProDays || 0
    };
}
