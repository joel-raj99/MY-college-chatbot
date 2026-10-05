import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'src', 'lib', 'db.json');

const defaultData = {
  settings: {
    mode: "ai", // "ai" or "keyword"
    apiKey: "",
    provider: "openrouter", // "openrouter" or "gemini"
    model: "openai/gpt-3.5-turbo",
    systemPrompt: "You are the helpful AI Admission Counselor for Apex Institute of Technology & Sciences. Use the college information provided below to answer user queries. Keep answers concise, informative, and friendly. If you don't know the answer, politely ask them to leave their contact details so a human counselor can follow up."
  },
  collegeInfo: {
    name: "Apex Institute of Technology & Sciences",
    tagline: "Fostering Innovation, Integrity, and Excellence since 2010",
    description: "Apex Institute is a premier institution offering state-of-the-art engineering, management, and technology education. Accredited with Grade 'A+', we prepare students for high-growth global careers through hands-on learning, industry-vetted curriculums, and research opportunities.",
    location: "Silicon Valley, CA (Metro Campus)",
    email: "admissions@apex-institute.edu",
    phone: "+1 (555) 019-2834",
    courses: [
      { id: "c1", name: "B.Tech Computer Science & Engineering", duration: "4 Years", fees: "₹1,50,000 / year", eligibility: "High school graduate with Physics, Chemistry, and Math. Min 75% aggregate." },
      { id: "c2", name: "B.Tech Data Science & AI", duration: "4 Years", fees: "₹1,60,000 / year", eligibility: "High school graduate with Math and Science background. Min 70% aggregate." },
      { id: "c3", name: "B.Tech Electronics & Communication", duration: "4 Years", fees: "₹1,40,000 / year", eligibility: "High school graduate with Physics, Chemistry, and Math. Min 65% aggregate." },
      { id: "c4", name: "MBA (Business Analytics)", duration: "2 Years", fees: "₹2,00,000 / year", eligibility: "Bachelor's degree in any stream with min 60% score + entrance interview clearance." },
      { id: "c5", name: "MCA (Master of Computer Applications)", duration: "2 Years", fees: "₹1,20,000 / year", eligibility: "BCA or Bachelor's in CS/Maths with minimum 55% score." }
    ],
    facilities: [
      { name: "Robotics & AI Center", description: "State-of-the-art laboratory powered by industry-grade equipment and GPU compute servers." },
      { name: "Smart Campus Hostels", description: "Fully air-conditioned residential blocks with high-speed Wi-Fi, laundry, and dining halls." },
      { name: "Central Digital Library", description: "Access to 50,000+ print volumes and digital subscriptions to IEEE, ACM, and Springer journals." },
      { name: "Sports & Wellness Complex", description: "Indoor gymnasium, Olympic-size swimming pool, and athletic courts for basketball, football, and tennis." }
    ],
    admissionProcess: [
      "Step 1: Submit the online enquiry form and verify your email.",
      "Step 2: Fill out the detailed Application Form and upload academic transcripts.",
      "Step 3: Attend the Online Aptitude Test & Personal Interview.",
      "Step 4: Receive admission offer and pay the registration/admission fees to secure your seat."
    ],
    dates: [
      { event: "Applications Open", date: "August 1, 2026" },
      { event: "Early Admission Round Deadline", date: "November 15, 2026" },
      { event: "Scholarship Test Schedule", date: "January 10, 2027" },
      { event: "Regular Application Deadline", date: "March 31, 2027" }
    ]
  },
  keywords: [
    { id: "k1", keyword: "fees", reply: "Our annual tuition fees are: B.Tech CSE (₹1,50,000), B.Tech Data Science (₹1,60,000), B.Tech ECE (₹1,40,000), MBA (₹2,00,000), and MCA (₹1,20,000). Installment options and educational loans are available." },
    { id: "k2", keyword: "hostel", reply: "Yes! We offer on-campus residential housing. The hostel charges are ₹65,000 per year, which covers fully-furnished rooms, 3 daily meals, laundry service, and full Wi-Fi/electricity backup." },
    { id: "k3", keyword: "scholarship", reply: "We offer merit scholarships: 50% tuition waiver for students scoring above 95% in high school, and 25% waiver for scores between 85% and 94%. We also support various government and sport scholarships." },
    { id: "k4", keyword: "placements", reply: "Apex Institute has an excellent placement record. Our average package is ₹8,50,000/year, and our highest package reached ₹45,000,00/year last year. Top recruiters include Google, Microsoft, Meta, Amazon, and TCS." }
  ],
  leads: [
    {
      id: "l1",
      name: "John Miller",
      email: "john.miller@example.com",
      phone: "+1 415 889 0292",
      course: "B.Tech Computer Science & Engineering",
      status: "New",
      notes: "Enquired about placement statistics and scholarship availability.",
      createdAt: "2026-07-18T08:15:30.000Z",
      chatHistory: [
        { sender: "user", text: "I'm interested in computer science" },
        { sender: "bot", text: "That is a great choice! Our B.Tech Computer Science & Engineering program is a 4-year degree focusing on software engineering, AI, and systems. What specific questions do you have?" },
        { sender: "user", text: "What is the fee and is there a placement cell?" },
        { sender: "bot", text: "The tuition fee is $12,000 per year. We also have an outstanding placement cell with recruiters like Google and Microsoft, securing an average package of $85,000/year." }
      ]
    },
    {
      id: "l2",
      name: "Sarah Patel",
      email: "sarah.patel@example.com",
      phone: "+1 650 493 0200",
      course: "MBA (Business Analytics)",
      status: "Contacted",
      notes: "Called on July 18 morning. Will submit transcripts by end of week.",
      createdAt: "2026-07-17T14:22:10.000Z",
      chatHistory: [
        { sender: "user", text: "Do you have an MBA in Business Analytics?" },
        { sender: "bot", text: "Yes! Our MBA (Business Analytics) is a 2-year program designed for professionals looking to master data-driven business leadership. The fee is $15,000/year." }
      ]
    }
  ]
};

export async function readDB() {
  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    if (!fs.existsSync(dbPath)) {
      await fs.promises.writeFile(dbPath, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    const fileContent = await fs.promises.readFile(dbPath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Error reading database:", error);
    return defaultData;
  }
}

export async function writeDB(data) {
  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    // Write atomically via a temporary file in the same folder to prevent half-writes
    const tempPath = `${dbPath}.tmp`;
    await fs.promises.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    await fs.promises.rename(tempPath, dbPath);
    return true;
  } catch (error) {
    console.error("Error writing database:", error);
    return false;
  }
}
