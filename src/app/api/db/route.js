import { NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db';

export async function GET(request) {
  try {
    const db = await readDB();
    return NextResponse.json(db);
  } catch (error) {
    return NextResponse.json({ error: "Failed to read database: " + error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, payload } = body;
    const db = await readDB();

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    let success = false;

    switch (action) {
      case 'update_settings':
        db.settings = { ...db.settings, ...payload };
        success = await writeDB(db);
        break;

      case 'update_college_info':
        db.collegeInfo = { ...db.collegeInfo, ...payload };
        success = await writeDB(db);
        break;

      case 'save_keyword':
        if (!db.keywords) db.keywords = [];
        if (payload.id) {
          // Update existing keyword
          db.keywords = db.keywords.map(kw => kw.id === payload.id ? { ...kw, ...payload } : kw);
        } else {
          // Create new keyword
          const newKeyword = {
            id: `k-${Date.now()}`,
            keyword: payload.keyword.trim().toLowerCase(),
            reply: payload.reply
          };
          db.keywords.push(newKeyword);
        }
        success = await writeDB(db);
        break;

      case 'delete_keyword':
        db.keywords = (db.keywords || []).filter(kw => kw.id !== payload.id);
        success = await writeDB(db);
        break;

      case 'save_lead':
        if (!db.leads) db.leads = [];
        if (payload.id) {
          // Update existing lead
          db.leads = db.leads.map(lead => lead.id === payload.id ? { ...lead, ...payload } : lead);
        } else {
          // Create new lead
          const newLead = {
            id: `l-${Date.now()}`,
            name: payload.name,
            email: payload.email,
            phone: payload.phone,
            course: payload.course || 'Unspecified',
            status: payload.status || 'New',
            notes: payload.notes || '',
            createdAt: new Date().toISOString(),
            chatHistory: payload.chatHistory || []
          };
          db.leads.push(newLead);
        }
        success = await writeDB(db);
        break;

      case 'delete_lead':
        db.leads = (db.leads || []).filter(lead => lead.id !== payload.id);
        success = await writeDB(db);
        break;

      case 'update_lead_status':
        db.leads = (db.leads || []).map(lead => lead.id === payload.id ? { ...lead, status: payload.status } : lead);
        success = await writeDB(db);
        break;

      case 'update_lead_notes':
        db.leads = (db.leads || []).map(lead => lead.id === payload.id ? { ...lead, notes: payload.notes } : lead);
        success = await writeDB(db);
        break;

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    if (success) {
      return NextResponse.json({ success: true, db });
    } else {
      return NextResponse.json({ error: "Failed to write data" }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Failed to process request: " + error.message }, { status: 500 });
  }
}
