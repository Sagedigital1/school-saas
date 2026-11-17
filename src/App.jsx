
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function App() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)

  // SaaS Tenant (School) State
  const [school, setSchool] = useState(null)
  const [schoolNameInput, setSchoolNameInput] = useState('')
  const [loading, setLoading] = useState(true)

  // CRM (Leads) & ERP (Students) State
  const [leads, setLeads] = useState([])
  const [students, setStudents] = useState([])
  const [leadName, setLeadName] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [gradeInput, setGradeInput] = useState('Grade 1')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchSchoolData(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchSchoolData(session.user.id)
      else {
        setSchool(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleAuth(e) {
    e.preventDefault()
    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message)
  }

  async function fetchSchoolData(userId) {
    setLoading(true)
    const { data: schoolData } = await supabase
      .from('schools')
      .select('*')
      .eq('owner_id', userId)
      .maybeSingle()

    if (schoolData) {
      setSchool(schoolData)
      const [leadsRes, studentsRes] = await Promise.all([
        supabase.from('leads').select('*').order('created_at', { ascending: false }),
        supabase.from('students').select('*').order('created_at', { ascending: false })
      ])
      setLeads(leadsRes.data || [])
      setStudents(studentsRes.data || [])
    }
    setLoading(false)
  }

  async function createSchool(e) {
    e.preventDefault()
    const { data, error } = await supabase
      .from('schools')
      .insert([{ name: schoolNameInput, owner_id: session.user.id }])
      .select()
      .single()

    if (error) alert(error.message)
    else setSchool(data)
  }

  async function togglePlan() {
    const newPlan = school.plan_type === 'free' ? 'pro' : 'free'
    const { data, error } = await supabase
      .from('schools')
      .update({ plan_type: newPlan })
      .eq('id', school.id)
      .select()
      .single()

    if (!error) setSchool(data)
  }

  async function addLead(e) {
    e.preventDefault()
    if (school.plan_type === 'free' && leads.length >= 3) {
      alert('Free Plan Limit Reached (Max 3 Inquiries). Click "Simulate Upgrade to Pro" to unlock unlimited leads!')
      return
    }
    const { error } = await supabase
      .from('leads')
      .insert([{ school_id: school.id, student_name: leadName, parent_phone: parentPhone }])

    if (error) alert(error.message)
    else {
      setLeadName('')
      setParentPhone('')
      fetchSchoolData(session.user.id)
    }
  }

  async function enrollLead(lead) {
    await supabase.from('students').insert([{
      school_id: school.id,
      full_name: lead.student_name,
      grade: gradeInput,
      fee_status: 'Pending'
    }])
    await supabase.from('leads').update({ status: 'Enrolled' }).eq('id', lead.id)
    fetchSchoolData(session.user.id)
  }

  async function toggleFee(student) {
    const nextStatus = student.fee_status === 'Pending' ? 'Paid' : 'Pending'
    await supabase.from('students').update({ fee_status: nextStatus }).eq('id', student.id)
    fetchSchoolData(session.user.id)
  }

  const boxStyle = { border: '1px solid #ddd', padding: '16px', borderRadius: '8px', marginBottom: '20px' }

  if (loading) return <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>Loading workspace...</div>

  if (!session) {
    return (
      <div style={{ maxWidth: '400px', margin: '60px auto', fontFamily: 'sans-serif' }}>
        <h2>{isSignUp ? 'Create School Admin Account' : 'School SaaS Login'}</h2>
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input type="email" placeholder="Admin Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: '8px' }} />
          <input type="password" placeholder="Password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '8px' }} />
          <button type="submit" style={{ padding: '10px', cursor: 'pointer' }}>{isSignUp ? 'Sign Up' : 'Login'}</button>
        </form>
        <p onClick={() => setIsSignUp(!isSignUp)} style={{ color: 'blue', cursor: 'pointer', marginTop: '12px' }}>
          {isSignUp ? 'Already have an account? Login' : 'New school? Create an account'}
        </p>
      </div>
    )
  }

  if (!school) {
    return (
      <div style={{ maxWidth: '450px', margin: '60px auto', fontFamily: 'sans-serif' }}>
        <h2>Welcome! Set Up Your School Workspace</h2>
        <p>This creates your isolated multi-tenant environment.</p>
        <form onSubmit={createSchool} style={{ display: 'flex', gap: '10px' }}>
          <input placeholder="e.g., Sunrise Public School" value={schoolNameInput} onChange={e => setSchoolNameInput(e.target.value)} required style={{ flex: 1, padding: '8px' }} />
          <button type="submit" style={{ padding: '8px 16px' }}>Create Workspace</button>
        </form>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '900px', margin: '20px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '12px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0 }}>{school.name}</h2>
          <small>Plan: <strong>{school.plan_type.toUpperCase()}</strong> ({school.plan_type === 'free' ? 'Max 3 CRM leads' : 'Unlimited leads'})</small>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={togglePlan} style={{ padding: '6px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {school.plan_type === 'free' ? 'Simulate Upgrade to Pro' : 'Downgrade to Free'}
          </button>
          <button onClick={() => supabase.auth.signOut()} style={{ padding: '6px 12px', cursor: 'pointer' }}>Logout</button>
        </div>
      </div>

      <div style={boxStyle}>
        <h3>1. CRM Module: Student Admission Inquiries</h3>
        <form onSubmit={addLead} style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <input placeholder="Student Name" value={leadName} onChange={e => setLeadName(e.target.value)} required style={{ padding: '8px' }} />
          <input placeholder="Parent Phone" value={parentPhone} onChange={e => setParentPhone(e.target.value)} style={{ padding: '8px' }} />
          <button type="submit" style={{ padding: '8px 16px', cursor: 'pointer' }}>+ Add Inquiry</button>
        </form>

        <table width="100%" border="1" cellPadding="8" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f4f4f4' }}>
              <th>Student</th>
              <th>Parent Phone</th>
              <th>Status</th>
              <th>CRM Action</th>
            </tr>
          </thead>
          <tbody>
            {leads.map(lead => (
              <tr key={lead.id}>
                <td>{lead.student_name}</td>
                <td>{lead.parent_phone || '-'}</td>
                <td>{lead.status}</td>
                <td>
                  {lead.status !== 'Enrolled' ? (
                    <>
                      <select value={gradeInput} onChange={e => setGradeInput(e.target.value)} style={{ marginRight: '6px' }}>
                        <option>Grade 1</option>
                        <option>Grade 2</option>
                        <option>Grade 3</option>
                      </select>
                      <button onClick={() => enrollLead(lead)}>Enroll into ERP →</button>
                    </>
                  ) : '✅ Moved to ERP'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={boxStyle}>
        <h3>2. ERP Module: Enrolled Students & Fee Tracker</h3>
        <table width="100%" border="1" cellPadding="8" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f4f4f4' }}>
              <th>Enrolled Student</th>
              <th>Grade</th>
              <th>Fee Status</th>
              <th>ERP Action</th>
            </tr>
          </thead>
          <tbody>
            {students.map(student => (
              <tr key={student.id}>
                <td>{student.full_name}</td>
                <td>{student.grade}</td>
                <td style={{ color: student.fee_status === 'Paid' ? 'green' : 'red', fontWeight: 'bold' }}>
                  {student.fee_status}
                </td>
                <td>
                  <button onClick={() => toggleFee(student)}>
                    Mark as {student.fee_status === 'Pending' ? 'Paid' : 'Pending'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
