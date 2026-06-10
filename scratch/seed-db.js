global.WebSocket = class {};
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Simple parser for env variables
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const MOCK_CORPORATE_SKILLS = [
  { id: 'bedrock', name: 'AWS Bedrock APIs', category: 'Cloud AI / GenAI', demand: 96, companies: ['Amazon', 'Accenture', 'TCS'], lastCrawled: new Date().toISOString() },
  { id: 'mulesoft', name: 'MuleSoft DataWeave', category: 'Integration Platforms', demand: 92, companies: ['Salesforce', 'Deloitte', 'Capgemini'], lastCrawled: new Date().toISOString() },
  { id: 'servicenow', name: 'ServiceNow Workflows', category: 'Enterprise Platforms', demand: 89, companies: ['Accenture', 'Deloitte', 'Infosys'], lastCrawled: new Date().toISOString() },
  { id: 'salesforce', name: 'Salesforce Apex Dev', category: 'CRM & ERP', demand: 91, companies: ['Salesforce', 'Cognizant', 'Persistent'], lastCrawled: new Date().toISOString() },
  { id: 'uipath', name: 'UiPath RPA Studio', category: 'RPA & Automation', demand: 87, companies: ['TCS Digital', 'Infosys BPM', 'Wipro'], lastCrawled: new Date().toISOString() },
  { id: 'canalyzer', name: 'Vector CANalyzer', category: 'Automotive Electronics', demand: 94, companies: ['Ather Energy', 'Ola Electric', 'Bosch'], lastCrawled: new Date().toISOString() },
  { id: 'ansys', name: 'Ansys FEA Solver', category: 'Simulation & FEA', demand: 85, companies: ['Tata Motors', 'Mahindra', 'HAL'], lastCrawled: new Date().toISOString() },
  { id: 'revit', name: 'Autodesk Revit BIM', category: 'BIM & Design', demand: 88, companies: ['L&T Construction', 'Shapoorji', 'DLF'], lastCrawled: new Date().toISOString() },
  { id: 'powerbi', name: 'Snowflake Analytics', category: 'Data & Analytics', demand: 86, companies: ['Deloitte', 'PwC', 'KPMG'], lastCrawled: new Date().toISOString() },
  { id: 'staad', name: 'STAAD.Pro Concrete', category: 'Structural Analysis', demand: 80, companies: ['L&T Construction', 'Gammon India', 'AECOM'], lastCrawled: new Date().toISOString() },
  { id: 'boomi', name: 'Dell Boomi Flow', category: 'Integration Platforms', demand: 83, companies: ['Dell Technologies', 'IBM', 'Accenture'], lastCrawled: new Date().toISOString() },
  { id: 'wordpress', name: 'Shopify Partners / WordPress', category: 'Web & eCommerce', demand: 82, companies: ['Digital agencies', 'D2C startups', 'startups'], lastCrawled: new Date().toISOString() },
  { id: 'watson', name: 'IBM Watson AI', category: 'Enterprise AI', demand: 85, companies: ['IBM India', 'TCS iON', 'Infosys'], lastCrawled: new Date().toISOString() },
  { id: 'aws-iot', name: 'AWS IoT Core Platform', category: 'IoT & Edge', demand: 90, companies: ['Ather Energy', 'Bosch India', 'Qualcomm'], lastCrawled: new Date().toISOString() },
  { id: 'labview', name: 'NI LabVIEW Systems', category: 'Test & Measurement', demand: 81, companies: ['ISRO', 'DRDO', 'Texas Instruments'], lastCrawled: new Date().toISOString() },
  { id: 'matlab-ece', name: 'MATLAB ECE Control', category: 'Simulation & Control', demand: 84, companies: ['Tata Elxsi', 'KPIT', 'Continental'], lastCrawled: new Date().toISOString() },
  { id: 'matlab-mech', name: 'MATLAB Mech Systems', category: 'Simulation & Control', demand: 83, companies: ['ISRO', 'DRDO', 'Tata Motors'], lastCrawled: new Date().toISOString() },
  { id: 'siemens-nx', name: 'Siemens NX CAD/PLM', category: 'CAD & PLM', demand: 86, companies: ['Tata Elxsi', 'HAL', 'Boeing India'], lastCrawled: new Date().toISOString() },
  { id: 'qgis', name: 'QGIS Geospatial Maps', category: 'GIS & Geospatial', demand: 82, companies: ['NHAI', 'Smart City SPVs', 'AECOM'], lastCrawled: new Date().toISOString() },
  { id: 'primavera', name: 'Oracle Primavera Scheduling', category: 'Project Management', demand: 79, companies: ['L&T Construction', 'Afcons', 'RITES'], lastCrawled: new Date().toISOString() },
  { id: 'ga4', name: 'Google Analytics & Ads', category: 'Digital Marketing', demand: 89, companies: ['Performics', 'GroupM', 'startups'], lastCrawled: new Date().toISOString() },
  { id: 'docker', name: 'Docker Containers', category: 'DevOps & Containers', demand: 92, companies: ['TCS', 'Cognizant', 'Razorpay'], lastCrawled: new Date().toISOString() },
  { id: 'kubernetes', name: 'Kubernetes Orchestration', category: 'DevOps & Containers', demand: 95, companies: ['Google', 'Microsoft', 'Red Hat'], lastCrawled: new Date().toISOString() },
  { id: 'terraform', name: 'Terraform IaC Cloud', category: 'DevOps & Infrastructure', demand: 91, companies: ['HashiCorp', 'AWS India', 'Deloitte'], lastCrawled: new Date().toISOString() },
  { id: 'kafka', name: 'Apache Kafka Streaming', category: 'Data Pipelines & Streaming', demand: 88, companies: ['Confluent', 'Uber India', 'Paytm'], lastCrawled: new Date().toISOString() },
  { id: 'redis', name: 'Redis Cache & Store', category: 'Caching & Databases', demand: 87, companies: ['Redis Labs', 'Swiggy', 'Zomato'], lastCrawled: new Date().toISOString() },
  { id: 'graphql', name: 'GraphQL Modern APIs', category: 'Modern APIs', demand: 86, companies: ['Meta', 'Shopify', 'Gartner'], lastCrawled: new Date().toISOString() },
  { id: 'nextjs', name: 'Next.js Web Framework', category: 'Web Frameworks', demand: 94, companies: ['Vercel', 'CRED', 'Zepto'], lastCrawled: new Date().toISOString() },
  { id: 'fastapi', name: 'FastAPI Python Web', category: 'Web Frameworks', demand: 85, companies: ['Netflix', 'Uber', 'TCS AI'], lastCrawled: new Date().toISOString() },
  { id: 'aws-lambda', name: 'AWS Lambda Serverless', category: 'Serverless Cloud', demand: 90, companies: ['Amazon', 'Accenture', 'Swiggy'], lastCrawled: new Date().toISOString() },
  { id: 'figma', name: 'Figma UI/UX Prototype', category: 'UI/UX Design', demand: 88, companies: ['Figma', 'Google', 'Flipkart'], lastCrawled: new Date().toISOString() },
  { id: 'altium', name: 'Altium Designer PCB', category: 'PCB Design', demand: 89, companies: ['Qualcomm', 'Intel', 'Ather Energy'], lastCrawled: new Date().toISOString() },
  { id: 'kicad', name: 'KiCad Open PCB', category: 'PCB Design', demand: 81, companies: ['DRDO', 'freelancers', 'makerspaces'], lastCrawled: new Date().toISOString() },
  { id: 'freertos', name: 'FreeRTOS IoT Kernel', category: 'Real-Time OS', demand: 91, companies: ['Bosch', 'Texas Instruments', 'Qualcomm'], lastCrawled: new Date().toISOString() },
  { id: 'stm32', name: 'STM32CubeMX Embedded', category: 'Embedded Systems', demand: 87, companies: ['Schneider', 'Ather', 'Bosch'], lastCrawled: new Date().toISOString() },
  { id: 'canoe', name: 'Vector CANoe Automotive', category: 'Automotive Electronics', demand: 90, companies: ['Ola Electric', 'Tesla India', 'Continental'], lastCrawled: new Date().toISOString() },
  { id: 'cadence', name: 'Cadence Virtuoso VLSI', category: 'VLSI Design', demand: 93, companies: ['Qualcomm', 'Intel', 'MediaTek'], lastCrawled: new Date().toISOString() },
  { id: 'synopsys', name: 'Synopsys ASIC Compiler', category: 'VLSI Design', demand: 92, companies: ['NVIDIA', 'Intel', 'AMD'], lastCrawled: new Date().toISOString() },
  { id: 'autocad3d', name: 'AutoCAD 3D Layouts', category: 'CAD & Design', demand: 80, companies: ['L&T', 'Godrej', 'Afcons'], lastCrawled: new Date().toISOString() },
  { id: 'creo', name: 'PTC Creo CAD Modeling', category: 'CAD & Design', demand: 83, companies: ['Mahindra', 'Caterpillar', 'John Deere'], lastCrawled: new Date().toISOString() },
  { id: 'fusion360', name: 'Autodesk Fusion CAM', category: 'CAD & CAM', demand: 84, companies: ['Tata Elxsi', 'startups', 'CNC shops'], lastCrawled: new Date().toISOString() },
  { id: 'fluent', name: 'Ansys Fluent CFD', category: 'Simulation & FEA', demand: 87, companies: ['Tata Motors', 'ISRO', 'GE'], lastCrawled: new Date().toISOString() },
  { id: 'lsdyna', name: 'Ansys LS-DYNA Crash', category: 'Simulation & FEA', demand: 86, companies: ['Mahindra', 'Maruti', 'L&T Defence'], lastCrawled: new Date().toISOString() },
  { id: 'catia', name: 'CATIA Aerospace CAD', category: 'CAD & Design', demand: 88, companies: ['Boeing', 'Airbus', 'HAL'], lastCrawled: new Date().toISOString() },
  { id: 'mastercam', name: 'Mastercam CNC CAM', category: 'CAM & CNC', demand: 81, companies: ['L&T Heavy', 'Godrej Aerospace', 'exporters'], lastCrawled: new Date().toISOString() },
  { id: 'civil3d', name: 'AutoCAD Civil 3D Roads', category: 'Civil Engineering', demand: 83, companies: ['NHAI contractors', 'AECOM', 'Jacobs'], lastCrawled: new Date().toISOString() },
  { id: 'etabs', name: 'Bentley ETABS Structures', category: 'Structural Analysis', demand: 86, companies: ['L&T Construction', 'Gammon', 'STUP'], lastCrawled: new Date().toISOString() },
  { id: 'tekla', name: 'Tekla Steel Structures', category: 'Structural Analysis', demand: 82, companies: ['Trimble', 'Shapoorji', 'Fabricators'], lastCrawled: new Date().toISOString() },
  { id: 'fpga', name: 'Xilinx Vivado (FPGA)', category: 'FPGA & VLSI', demand: 93, companies: ['Qualcomm', 'Intel', 'NVIDIA'], lastCrawled: new Date().toISOString() },
  { id: 'solidworks', name: 'SolidWorks', category: 'CAD & Design', demand: 85, companies: ['Tata Motors', 'Mahindra', 'Godrej'], lastCrawled: new Date().toISOString() }
];

async function seed() {
  console.log("Upserting " + MOCK_CORPORATE_SKILLS.length + " skills to Supabase...");
  try {
    const rows = MOCK_CORPORATE_SKILLS.map(s => ({
      id: s.id,
      name: s.name,
      category: s.category,
      demand: s.demand,
      companies: s.companies,
      last_crawled: s.lastCrawled
    }));

    const { data, error } = await supabase
      .from('corporate_skills')
      .upsert(rows);

    if (error) {
      console.error("Supabase upsert error:", error);
    } else {
      console.log("Seeding complete! Successfully upserted skills.");
    }
  } catch (err) {
    console.error("Exception during seeding:", err);
  }
}

seed();
