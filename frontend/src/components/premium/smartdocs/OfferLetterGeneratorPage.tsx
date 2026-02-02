import React, { useEffect, useRef, useState } from 'react';
import { OfferLetterAPI } from '@/lib/api';
import { Clock, ZoomIn, ZoomOut } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

type EmploymentType = 'Internship' | 'Contract' | 'Full-time' | 'Part-time' | 'Other';

interface OfferFormState {
  dateOfOffer: string;
  employeeName: string;
  jobProfile: string;
  reportingManagerName: string;
  joiningDate: string;
  employmentType: EmploymentType;
  workSchedule: string;
  jobLocation: string;
  annualSalary: string;
  probationPeriodDays?: string;
  companyName: string;
  companyEmail: string;
  companyAddress: string;
  representativeName: string;
}

function InputLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-gray-700 mb-1">{children}</label>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-semibold text-gray-900 mb-3">{children}</h2>;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <InputLabel>{label}</InputLabel>
      {children}
    </div>
  );
}

const defaultState: OfferFormState = {
  dateOfOffer: '',
  employeeName: '',
  jobProfile: '',
  reportingManagerName: '',
  joiningDate: '',
  employmentType: 'Full-time',
  workSchedule: '',
  jobLocation: '',
  annualSalary: '',
  companyName: 'CompanyName',
  companyEmail: 'hr@example.com',
  companyAddress: '',
  representativeName: '',
};

const OfferLetterGeneratorPage: React.FC = () => {
  const [form, setForm] = useState<OfferFormState>(defaultState);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const page1Ref = useRef<HTMLDivElement>(null);
  // single-page layout now; acceptance appended at the end of page1
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<Array<{ id: number; title: string; createdAt: string }>>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(0.7);

  // Load from localStorage
  useEffect(() => {
    try {
      const cached = localStorage.getItem('offerLetter.form');
      if (cached) setForm({ ...defaultState, ...JSON.parse(cached) });
      const logo = localStorage.getItem('offerLetter.logo');
      if (logo) setLogoDataUrl(logo);
    } catch {}
  }, []);

  // Persist to localStorage with debounce
  useEffect(() => {
    const id = setTimeout(() => {
      try { localStorage.setItem('offerLetter.form', JSON.stringify(form)); } catch {}
    }, 300);
    return () => clearTimeout(id);
  }, [form]);

  useEffect(() => {
    if (logoDataUrl) {
      try { localStorage.setItem('offerLetter.logo', logoDataUrl); } catch {}
    }
  }, [logoDataUrl]);

  const onChange = (field: keyof OfferFormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  // No heavy memo needed; we render directly from state for immediate updates

  function onLogoSelected(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const targetHeight = 40; // shrink vertically for a compact header
        const scale = Math.min(1, targetHeight / img.height);
        const canvas = document.createElement('canvas');
        canvas.height = Math.max(1, Math.floor(img.height * scale));
        canvas.width = Math.max(1, Math.floor(img.width * scale));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          // Use JPEG to keep payload very small
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setLogoDataUrl(dataUrl);
        } else {
          setLogoDataUrl(src);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  async function downloadPdf() {
    if (!page1Ref.current) return;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const canvas = await html2canvas(page1Ref.current, { backgroundColor: '#ffffff', scale: 1.6, useCORS: true });
    const imgData = canvas.toDataURL('image/jpeg', 0.78);
    pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
    pdf.save(`Offer_Letter_${form.employeeName || 'Candidate'}.pdf`);
  }

  async function handleSave() {
    try {
      setSaving(true);
      // Ensure logo stays small to avoid backend body limit
      let smallLogo: string | undefined = logoDataUrl || undefined;
      if (smallLogo && smallLogo.length > 120000) {
        try {
          const img = new Image();
          const compressed = await new Promise<string>((resolve) => {
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
              } else {
                resolve(smallLogo!);
              }
            };
            img.src = smallLogo!;
          });
          smallLogo = compressed;
        } catch {}
      }
      if (smallLogo && smallLogo.length > 160000) {
        // As a last resort, skip logo to prevent save failure
        smallLogo = undefined;
      }
      const payload = { title: `Offer - ${form.employeeName || 'Untitled'}`, data: form, logo: smallLogo };
      await OfferLetterAPI.create(payload);
    } catch (e) {
      console.error(e);
      alert('Failed to save offer letter');
    } finally {
      setSaving(false);
    }
  }

  async function loadHistory() {
    try {
      setLoadingHistory(true);
      const items = await OfferLetterAPI.list();
      setHistoryItems(items);
    } catch (e) {
      console.error(e);
      alert('Failed to load history');
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    if (historyOpen) loadHistory();
  }, [historyOpen]);

  const EditableSpan: React.FC<{ field: keyof OfferFormState; placeholder: string; className?: string; formatter?: (v:string)=>string; parser?: (v:string)=>string; }>
    = ({ field, placeholder, className = '', formatter, parser }) => {
    const value = String((form as any)[field] || '');
    const display = value || placeholder;
    return (
      <span
        contentEditable
        suppressContentEditableWarning
        className={`${className} text-gray-900 ${!value ? 'text-gray-500' : ''}`}
        onInput={(e) => {
          const text = (e.currentTarget.textContent || '').trim();
          const parsed = parser ? parser(text) : text;
          setForm(prev => ({ ...prev, [field]: parsed }));
        }}
        onBlur={(e) => {
          const text = (e.currentTarget.textContent || '').trim();
          const parsed = parser ? parser(text) : text;
          setForm(prev => ({ ...prev, [field]: parsed }));
        }}
      >{formatter ? formatter(display) : display}</span>
    );
  };

  function formatDateForDisplay(iso: string) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  function formatINR(value: string) {
    if (!value) return '';
    const n = Number(value);
    if (Number.isNaN(n)) return value;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(n);
  }

  return (
    <div className="w-full min-h-screen bg-white">
      <div className="w-full max-w-[1400px] mx-auto px-4 py-4 flex gap-6 lg:gap-8 items-stretch" style={{ minHeight: '100vh' }}>
        {/* Left: Scrollable form */}
        <div className="w-full lg:w-1/2 xl:w-7/12 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-200 bg-white sticky top-0 z-10 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Offer Letter</h1>
            <div className="flex items-center gap-3">
              <button onClick={() => setHistoryOpen((v) => !v)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50" title="History">
                <Clock size={16} />
                <span>History</span>
              </button>
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={(e)=>onLogoSelected(e.target.files?.[0]||null)} />
                <span>Upload Logo</span>
              </label>
              <button onClick={downloadPdf} className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow">Download PDF</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <SectionTitle>Details of Offer</SectionTitle>
            <Field label="Date of Offer*">
              <input type="date" placeholder="Select date" aria-label="Date of Offer" title="Date of Offer" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={form.dateOfOffer} onChange={onChange('dateOfOffer')} />
            </Field>
            <SectionTitle>Employee Details</SectionTitle>
            <Field label="Enter name of employee*">
              <input type="text" placeholder="John Doe" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={form.employeeName} onChange={onChange('employeeName')} />
            </Field>
            <SectionTitle>Details of Job Position</SectionTitle>
            <Field label="Enter Job Profile*">
              <input type="text" placeholder="Software Engineer" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={form.jobProfile} onChange={onChange('jobProfile')} />
            </Field>
            <Field label="Enter name of reporting manager*">
              <input type="text" placeholder="Jane Smith" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={form.reportingManagerName} onChange={onChange('reportingManagerName')} />
            </Field>
            <Field label="Enter Joining Date*">
              <input type="date" placeholder="Select joining date" aria-label="Joining Date" title="Joining Date" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={form.joiningDate} onChange={onChange('joiningDate')} />
            </Field>
            <Field label="Select employment type*">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(['Internship','Contract','Full-time','Part-time','Other'] as EmploymentType[]).map(opt => (
                  <label key={opt} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer ${form.employmentType === opt ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'}`}>
                    <input type="radio" className="accent-blue-600" checked={form.employmentType === opt} onChange={() => setForm(prev => ({ ...prev, employmentType: opt }))} />
                    <span className="text-sm text-gray-800">{opt}</span>
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Work Schedule">
              <input type="text" placeholder="9am–6pm, Mon–Fri" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={form.workSchedule} onChange={onChange('workSchedule')} />
            </Field>
            <Field label="Select Job Location*">
              <input type="text" placeholder="Remote / In-Office / Hybrid" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={form.jobLocation} onChange={onChange('jobLocation')} />
            </Field>
            <SectionTitle>Compensation</SectionTitle>
            <Field label="Annual Salary Package of*">
              <input type="number" placeholder="450000" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={form.annualSalary} onChange={onChange('annualSalary')} />
            </Field>
            <Field label="Enter probation period in days (optional)">
              <input type="number" placeholder="90" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={form.probationPeriodDays || ''} onChange={onChange('probationPeriodDays')} />
            </Field>
            <SectionTitle>Company Details</SectionTitle>
            <Field label="Enter company name*">
              <input type="text" placeholder="eSahayak Inc." aria-label="Company Name" title="Company Name" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={form.companyName} onChange={onChange('companyName')} />
            </Field>
            <Field label="Enter email address of company*">
              <input type="email" placeholder="hello@example.com" aria-label="Company Email" title="Company Email" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={form.companyEmail} onChange={onChange('companyEmail')} />
            </Field>
            <Field label="Enter registered address of company*">
              <input type="text" placeholder="#46, 10th Floor, ..." aria-label="Company Address" title="Company Address" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={form.companyAddress} onChange={onChange('companyAddress')} />
            </Field>
            <SectionTitle>Authorized Representative</SectionTitle>
            <Field label="Enter name of authorized person*">
              <input type="text" placeholder="Mr. Pushpak Singh" aria-label="Authorized Representative" title="Authorized Representative" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={form.representativeName} onChange={onChange('representativeName')} />
            </Field>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>

        {/* Right: Live preview */}
        <div className="hidden lg:block w-1/2 xl:w-5/12 bg-gray-50 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-2 border-b border-gray-200 bg-white sticky top-0 z-10 flex items-center justify-between">
            <div className="text-sm text-gray-700">Preview</div>
            <div className="flex items-center gap-2">
              <button aria-label="Zoom out" className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 text-gray-700" onClick={()=>setZoom(z=>Math.max(0.7, z-0.1))}>
                <ZoomOut size={16} />
              </button>
              <div className="w-12 text-center text-sm tabular-nums">{Math.round(zoom*100)}%</div>
              <button aria-label="Zoom in" className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 text-gray-700" onClick={()=>setZoom(z=>Math.min(1.4, z+0.1))}>
                <ZoomIn size={16} />
              </button>
            </div>
          </div>
          <div className="h-full overflow-auto overflow-x-hidden p-4 pb-1">
            <div className="flex justify-center">
              <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
            {/* Single Page */}
              <div ref={page1Ref} className="relative mx-auto bg-white rounded-lg p-0 w-[794px] h-[1123px] max-w-none border border-gray-200" style={{ fontFamily: 'Georgia, Cambria, Times, \"Times New Roman\", serif' }}>
                <div className="px-10 pt-5">
                  {logoDataUrl && (<img src={logoDataUrl} alt="Company logo" className="max-h-[50px] w-auto object-contain mb-2" />)}
                  <div className="font-semibold text-xl text-gray-900"><EditableSpan field="companyName" placeholder="CompanyName" /></div>
                  <div className="text-sm text-gray-700"><EditableSpan field="companyEmail" placeholder="CompanyEmail" /></div>
                  <div className="text-sm text-gray-700"><EditableSpan field="companyAddress" placeholder="CompanyAddress" /></div>
                  <hr className="my-2" />
                  <h2 className="text-2xl font-semibold text-center text-gray-900 mb-3">Offer Letter</h2>
                  <div className="text-sm text-gray-800 mb-2 font-medium">Date: <EditableSpan field="dateOfOffer" placeholder="DateOfOffer" formatter={formatDateForDisplay} /></div>
                  <p className="mb-2 text-gray-900">Dear <span className="font-semibold"><EditableSpan field="employeeName" placeholder="EmployeeName" /></span>,</p>
                  <p className="mb-4 leading-6 text-gray-800">We are pleased to extend an offer of employment to you for the position of <span className="font-semibold"><EditableSpan field="jobProfile" placeholder="JobProfile" /></span> at <span className="font-semibold"><EditableSpan field="companyName" placeholder="CompanyName" /></span>. We believe your skills and experience will be a valuable addition to our team. Please read through this letter and indicate your acceptance by signing this offer letter.</p>
                  <h3 className="font-semibold text-gray-900 mb-2">Position Details</h3>
                  <ul className="list-disc pl-6 space-y-1 mb-4 text-gray-800">
                    <li>Job Title: <EditableSpan field="jobProfile" placeholder="JobProfile" /></li>
                    <li>Reporting to: <EditableSpan field="reportingManagerName" placeholder="ReportingManagerName" /></li>
                    <li>Start Date: <EditableSpan field="joiningDate" placeholder="JoiningDate" formatter={formatDateForDisplay} /></li>
                    <li>Employment Type: <EditableSpan field="employmentType" placeholder="EmploymentType" /></li>
                    <li>Work Schedule: <EditableSpan field="workSchedule" placeholder="WorkSchedule" /></li>
                    <li>Job Location: <EditableSpan field="jobLocation" placeholder="JobLocation" /></li>
                  </ul>
                  <h3 className="font-semibold text-gray-900 mb-2">Compensation and Benefits</h3>
                  <ul className="list-disc pl-6 space-y-1 mb-4 text-gray-800">
                    <li>Annual Salary Package: <span className="font-semibold"><EditableSpan field="annualSalary" placeholder="0" formatter={formatINR} parser={(v)=>v.replace(/[^0-9]/g,'')} /></span></li>
                  </ul>
                  <h3 className="font-semibold text-gray-900 mb-2">Terms and Conditions</h3>
                  <ul className="list-disc pl-6 space-y-1 mb-2 text-gray-800">
                    <li>The employment is at-will, which means that either the company or the employee can terminate the employment relationship at any time, with or without cause and with or without notice.</li>
                    <li>This offer of employment does not constitute a contract or guarantee of continued employment. It is not intended to create an employment relationship between you and <span className="font-semibold"><EditableSpan field="companyName" placeholder="CompanyName" /></span> until you have signed the necessary employment agreement and any other required documents.</li>
                    <li>You will be required to sign Confidentiality/Non-Compete Agreement after accepting this offer letter to protect our company's interests.</li>
                  </ul>

                  {/* Acceptance appended at end of page to keep single-page layout */}
                  <h3 className="font-semibold text-gray-900 mb-2">Acceptance</h3>
                  <p className="mb-3 text-gray-800">This Letter of Offer contains the proposed Terms and Conditions of your employment and is subject to the preparation and execution of a formal Contract of Employment.</p>
                  <div className="mt-4">
                    <p className="mb-1">Sincerely,</p>
                    <div className="w-64 h-12 bg-yellow-100 border border-yellow-300 rounded mb-2 flex items-center justify-center text-yellow-800">CompanyRepresentativeSign</div>
                    <div className="text-sm text-gray-700">
                      <div><EditableSpan field="representativeName" placeholder="Company Representative" />'s Signature</div>
                      <div className="font-semibold"><EditableSpan field="companyName" placeholder="CompanyName" /></div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="mb-2 text-gray-800">I <span className="font-semibold"><EditableSpan field="employeeName" placeholder="EmployeeName" /></span>, accept, and agree to the proposed terms of employment and request that the Employer prepares a formal contract of employment for execution.</p>
                    <div className="w-64 h-12 bg-yellow-100 border border-yellow-300 rounded mb-1 flex items-center justify-center text-yellow-800">EmployeeSign</div>
                    <div className="text-sm text-gray-700">employee Signature</div>
                    <div className="text-sm font-semibold">Employee</div>
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {historyOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={() => setHistoryOpen(false)}>
          <div className="w-full max-w-lg bg-white rounded-xl shadow-lg border border-gray-200" onClick={(e)=>e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Offer Letter History</h3>
              <button className="text-gray-500 hover:text-gray-700" onClick={()=>setHistoryOpen(false)}>Close</button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-3">
              {loadingHistory ? (
                <div className="p-4 text-sm text-gray-600">Loading...</div>
              ) : historyItems.length === 0 ? (
                <div className="p-4 text-sm text-gray-600">No records yet.</div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {historyItems.map(item => (
                    <li key={item.id} className="p-3 hover:bg-gray-50 cursor-pointer" onClick={async()=>{
                      try {
                        const full = await OfferLetterAPI.get(item.id);
                        setForm(full.data || defaultState);
                        setLogoDataUrl(full.logo || null);
                        setHistoryOpen(false);
                      } catch (e) { console.error(e); alert('Failed to load offer'); }
                    }}>
                      <div className="text-sm font-medium text-gray-900">{item.title || `Offer #${item.id}`}</div>
                      <div className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfferLetterGeneratorPage;


