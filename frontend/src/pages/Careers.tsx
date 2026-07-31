import React, { useState, useMemo } from 'react';
import { useCMS } from '../context/CMSContext';
import { SEO } from '../components/SEO';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, Plane, Award, Briefcase, X, 
  Upload, CheckCircle2 
} from 'lucide-react';

export const Careers: React.FC = () => {
  const { jobs, seoSettings } = useCMS();

  // Filter States
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedLoc, setSelectedLoc] = useState('All');

  // Application Modal States
  const [activeApplyJob, setActiveApplyJob] = useState<any | null>(null);
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [fileName, setFileName] = useState('');
  const [applySuccess, setApplySuccess] = useState(false);

  // Derive filter lists
  const departments = useMemo(() => {
    const set = new Set(jobs.map((j) => j.department));
    return ['All', ...Array.from(set)];
  }, [jobs]);

  const locations = useMemo(() => {
    const set = new Set(jobs.map((j) => j.location));
    return ['All', ...Array.from(set)];
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      const matchDept = selectedDept === 'All' || j.department === selectedDept;
      const matchLoc = selectedLoc === 'All' || j.location === selectedLoc;
      return matchDept && matchLoc;
    });
  }, [jobs, selectedDept, selectedLoc]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    }
  };

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantName.trim() || !applicantEmail.trim() || !fileName) {
      alert('Please enter your details and upload a resume.');
      return;
    }

    setApplySuccess(true);
    setTimeout(() => {
      // Reset and close
      setApplySuccess(false);
      setActiveApplyJob(null);
      setApplicantName('');
      setApplicantEmail('');
      setCoverLetter('');
      setFileName('');
    }, 2500);
  };

  const seo = seoSettings.careers || {
    title: 'Careers at FreshCart | Join the Fast-Growing Grocery Startup',
    description: 'We are hiring! Explore open positions in software development, marketing, and logistics. Apply now to shape hyper-local delivery.',
    keywords: 'careers startup bangalore, hiring react engineer, logistics jobs'
  };

  const benefitsList = [
    { title: 'Top-tier Health Cover', desc: 'Full premium cover for you and your family, including parents.', icon: <Heart size={20} /> },
    { title: 'Unlimited PTO', desc: 'Take time off when you need it. We trust our teams to own deliverables.', icon: <Plane size={20} /> },
    { title: 'Equity Options', desc: 'Every early team member receives stock grants to share in the growth.', icon: <Award size={20} /> },
    { title: 'Annual Learn Budget', desc: '₹50,000 every year to spend on books, courses, or tech conferences.', icon: <Briefcase size={20} /> }
  ];

  return (
    <div className="page-wrapper">
      <SEO 
        title={seo.title}
        description={seo.description}
        keywords={seo.keywords}
      />

      <div className="container mx-auto px-4 md:px-6 max-w-[1000px] py-8 pb-16">
        {/* Title Header */}
        <section className="text-center mb-12">
          <h1 className="text-4xl font-extrabold mb-3 text-text-primary">Join the FreshCart Team</h1>
          <p className="text-sm text-text-secondary">We are scaling hyper-local delivery pipelines and building premium tech. Explore open positions.</p>
        </section>

        {/* Perks list */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {benefitsList.map((perk, idx) => (
            <div key={idx} className="bg-surface p-6 rounded-2xl border border-divider shadow-card flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">{perk.icon}</div>
              <h3 className="text-base font-bold text-text-primary">{perk.title}</h3>
              <p className="text-xs text-text-secondary leading-relaxed">{perk.desc}</p>
            </div>
          ))}
        </section>

        {/* Filters Panel */}
        <section className="flex flex-wrap items-center justify-center gap-4 bg-background p-4 rounded-xl border border-divider mb-8">
          <span className="font-bold text-xs md:text-sm text-text-secondary">Filter Positions:</span>
          
          <select 
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary text-text-primary font-medium"
          >
            <option value="All">All Departments</option>
            {departments.filter(d => d !== 'All').map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          <select 
            value={selectedLoc}
            onChange={(e) => setSelectedLoc(e.target.value)}
            className="px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary text-text-primary font-medium"
          >
            <option value="All">All Locations</option>
            {locations.filter(l => l !== 'All').map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </section>

        {/* Jobs List */}
        <section className="flex flex-col gap-6">
          {filteredJobs.length === 0 ? (
            <div className="bg-surface p-12 rounded-2xl border border-divider text-center shadow-card">
              <p className="text-sm text-text-secondary">No active positions match your filter criteria at this time.</p>
            </div>
          ) : (
            filteredJobs.map((job) => (
              <div key={job.id} className="bg-surface border border-divider rounded-2xl p-6 shadow-card flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex-grow flex flex-col gap-2">
                  <h3 className="text-lg font-bold text-text-primary">{job.title}</h3>
                  <div className="flex flex-wrap gap-4 text-xs text-text-secondary font-medium">
                    <span>📂 {job.department}</span>
                    <span>📍 {job.location}</span>
                    <span>🕒 {job.type}</span>
                    <span>💼 {job.experience}</span>
                  </div>
                  <p className="text-xs md:text-sm text-text-secondary leading-relaxed mt-1">{job.description}</p>
                  
                  <div className="mt-2.5">
                    <h5 className="font-bold text-text-primary text-xs mb-1">Requirements:</h5>
                    <ul className="list-disc pl-5 text-xs text-text-secondary flex flex-col gap-1">
                      {job.requirements.map((req: string, i: number) => (
                        <li key={i}>{req}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <button 
                  onClick={() => setActiveApplyJob(job)}
                  className="bg-primary text-white font-bold py-2.5 px-6 rounded-full text-xs hover:bg-secondary transition-colors whitespace-nowrap self-start md:self-center"
                >
                  Apply Now
                </button>
              </div>
            ))
          )}
        </section>
      </div>

      {/* Application Form sliding modal */}
      <AnimatePresence>
        {activeApplyJob && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1050] flex items-center justify-center p-4" onClick={() => setActiveApplyJob(null)}>
            <motion.div 
              className="bg-surface border border-divider rounded-2xl w-full max-w-[500px] p-6 md:p-8 relative shadow-premium flex flex-col gap-3"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
            >
              <button className="absolute top-4 right-4 text-text-secondary hover:text-primary transition-colors" onClick={() => setActiveApplyJob(null)}>
                <X size={18} />
              </button>

              {applySuccess ? (
                <div className="flex flex-col items-center text-center gap-3 py-6 text-success">
                  <CheckCircle2 size={48} />
                  <h3 className="text-lg font-bold">Application Submitted!</h3>
                  <p className="text-text-secondary text-xs leading-relaxed">Thank you for applying for the {activeApplyJob.title} position. Our recruitment team will review your CV and connect shortly.</p>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-extrabold text-text-primary font-display">Apply for Position</h3>
                  <span className="text-xs font-bold text-primary">{activeApplyJob.title}</span>
                  
                  <form onSubmit={handleApplySubmit} className="flex flex-col gap-4 mt-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-text-primary">Full Name</label>
                      <input
                        type="text"
                        placeholder="e.g. John Doe"
                        value={applicantName}
                        onChange={(e) => setApplicantName(e.target.value)}
                        className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-text-primary">Email Address</label>
                      <input
                        type="email"
                        placeholder="e.g. john@example.com"
                        value={applicantEmail}
                        onChange={(e) => setApplicantEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-text-primary">Upload Resume (PDF, DOCX)</label>
                      <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-divider rounded-xl bg-background cursor-pointer hover:border-primary transition-colors">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileChange}
                          className="hidden"
                          required
                        />
                        <div className="flex flex-col items-center gap-2 text-text-secondary text-xs">
                          <Upload size={20} className="text-primary" />
                          <span>{fileName || 'Click to select and upload resume'}</span>
                        </div>
                      </label>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-text-primary">Cover Letter / Why FreshCart? (Optional)</label>
                      <textarea
                        placeholder="Tell us why you are a great fit for FreshCart..."
                        rows={4}
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                        className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary"
                      />
                    </div>

                    <button type="submit" className="bg-primary text-white font-bold py-3 rounded-full text-xs mt-2 hover:bg-secondary transition-all duration-200">
                      Submit Application
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
