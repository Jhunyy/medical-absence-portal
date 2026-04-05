import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EyeIcon, EyeSlashIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const DEPARTMENTS = [
  'College of Computer Studies (CCS)', 
  'College of Engineering (COE)', 
  'College of Health and Sciences (CHS)', 
  'College of Science and Mathematics (CSM)',
  'College of Economics, Business and Accountancy (CEBA)', 
  'College of Education (COE)', 
  'College of Arts & Social Sciences (CASS)', 
  'Others'
];

export default function Register() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const [step,    setStep]    = useState(0); // 0=role select, 1=personal, 2=password
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState({});

  const [showPassword,        setShowPassword]        = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showClinicCode,      setShowClinicCode]      = useState(false);

  const [formData, setFormData] = useState({
    role:            '',
    firstName:       '',
    lastName:        '',
    email:           '',
    studentId:       '',
    employeeId:      '',
    department:      '',
    clinicCode:      '',
    password:        '',
    confirmPassword: ''
  });

  const set = (field) => (e) => {
    setFormData(p => ({ ...p, [field]: e.target.value }));
    setErrors(p => ({ ...p, [field]: '' }));
  };

  const isStudent       = formData.role === 'student';
  const isHealthOfficer = formData.role === 'health_officer';

  // ── Validation ──────────────────────────────────────────────────────────────
  const validateStep1 = () => {
    const errs = {};
    if (!formData.firstName.trim()) errs.firstName = 'First name is required.';
    if (!formData.lastName.trim())  errs.lastName  = 'Last name is required.';
    if (!formData.email.trim())     errs.email     = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Enter a valid email address.';
    if (isStudent && !formData.studentId.trim())
      errs.studentId = 'Student ID is required.';
    if (isHealthOfficer && !formData.clinicCode.trim())
      errs.clinicCode = 'Clinic registration code is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs = {};
    if (!formData.department) errs.department = 'Please select a department.';
    if (!formData.password)   errs.password   = 'Password is required.';
    else if (formData.password.length < 8)
      errs.password = 'Password must be at least 8 characters.';
    else if (!/[A-Z]/.test(formData.password))
      errs.password = 'Must contain at least one uppercase letter.';
    else if (!/[0-9]/.test(formData.password))
      errs.password = 'Must contain at least one number.';
    if (formData.password !== formData.confirmPassword)
      errs.confirmPassword = 'Passwords do not match.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep2()) return;
    setLoading(true);
    try {
      await registerUser({
        firstName:  formData.firstName.trim(),
        lastName:   formData.lastName.trim(),
        email:      formData.email.trim(),
        password:   formData.password,
        role:       formData.role,
        department: formData.department,
        ...(isStudent       && { studentId:  formData.studentId.trim() }),
        ...(isHealthOfficer && { employeeId: formData.employeeId.trim() }),
        ...(isHealthOfficer && { clinicCode: formData.clinicCode.trim() }),
      });
      toast.success('Account created! Please sign in.');
      navigate('/login', { state: { message: 'Registration successful! Please log in.' } });
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (Array.isArray(serverErrors) && serverErrors.length > 0) {
        const mapped = {};
        serverErrors.forEach(e => { if (e.field) mapped[e.field] = e.message; });
        setErrors(mapped);
        const step1Fields = ['firstName', 'lastName', 'email', 'studentId', 'clinicCode'];
        if (serverErrors.some(e => step1Fields.includes(e.field))) setStep(1);
        return;
      }
      // Show the server error message directly — covers wrong clinic code
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field) =>
    `w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white
     placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500
     transition-colors ${errors[field]
       ? 'border-red-400 dark:border-red-500'
       : 'border-gray-300 dark:border-gray-600'}`;

  const EyeToggle = ({ show, onToggle }) => (
    <button type="button" onClick={onToggle} tabIndex={-1}
      className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      aria-label={show ? 'Hide' : 'Show'}>
      {show ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg w-full max-w-md p-8">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-3">
            <span className="text-2xl">🏥</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Account</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Medical Absence Portal</p>
        </div>

        {/* Step indicator */}
        {step > 0 && (
          <div className="flex items-center justify-center mb-6">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>{s}</div>
                {s < 2 && <div className={`w-16 h-1 mx-1 transition-colors ${step > s ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} />}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>

          {/* ── Step 0: Role selection ─────────────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center mb-2">
                I am registering as a...
              </p>

              <button type="button"
                onClick={() => { setFormData(p => ({ ...p, role: 'student' })); setStep(1); }}
                className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left group">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-2xl flex-shrink-0">🎓</div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400">Student</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Submit and track medical absence requests</p>
                  </div>
                </div>
              </button>

              <button type="button"
                onClick={() => { setFormData(p => ({ ...p, role: 'health_officer' })); setStep(1); }}
                className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all text-left group">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-2xl flex-shrink-0">🏥</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-400">
                        Clinic Staff / Health Officer
                      </p>
                      <LockClosedIcon className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Review and approve student absence requests — requires clinic code
                    </p>
                  </div>
                </div>
              </button>

              <p className="text-center text-xs text-gray-400 dark:text-gray-500 pt-1">
                Administrator accounts are created by existing admins only.
              </p>
            </div>
          )}

          {/* ── Step 1: Personal Info ──────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Role badge */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                isStudent
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                  : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
              }`}>
                <span>{isStudent ? '🎓' : '🏥'}</span>
                <span>{isStudent ? 'Registering as Student' : 'Registering as Clinic Staff'}</span>
                <button type="button" onClick={() => setStep(0)}
                  className="ml-auto text-xs underline opacity-70 hover:opacity-100">
                  Change
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                  <input type="text" value={formData.firstName} onChange={set('firstName')}
                    placeholder="Juan" className={inputClass('firstName')} />
                  {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                  <input type="text" value={formData.lastName} onChange={set('lastName')}
                    placeholder="Dela Cruz" className={inputClass('lastName')} />
                  {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                <input type="email" value={formData.email} onChange={set('email')}
                  placeholder="you@university.edu" className={inputClass('email')} />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
              </div>

              {/* Student ID — students only */}
              {isStudent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Student ID <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={formData.studentId} onChange={set('studentId')}
                    placeholder="2024-00001" className={inputClass('studentId')} />
                  {errors.studentId && <p className="mt-1 text-xs text-red-500">{errors.studentId}</p>}
                </div>
              )}

              {/* Health officer fields */}
              {isHealthOfficer && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Employee ID <span className="text-xs text-gray-400">(optional)</span>
                    </label>
                    <input type="text" value={formData.employeeId} onChange={set('employeeId')}
                      placeholder="EMP-0001" className={inputClass('employeeId')} />
                  </div>

                  {/* Clinic registration code */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Clinic Registration Code <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showClinicCode ? 'text' : 'password'}
                        value={formData.clinicCode}
                        onChange={set('clinicCode')}
                        placeholder="Enter the code provided by the clinic admin"
                        className={`${inputClass('clinicCode')} pr-11`}
                      />
                      <EyeToggle show={showClinicCode} onToggle={() => setShowClinicCode(p => !p)} />
                    </div>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      Contact your clinic administrator to obtain this code.
                    </p>
                    {errors.clinicCode && <p className="mt-1 text-xs text-red-500">{errors.clinicCode}</p>}
                  </div>
                </>
              )}

              <button type="button" onClick={() => validateStep1() && setStep(2)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors mt-2">
                Next →
              </button>
            </div>
          )}

          {/* ── Step 2: Department & Password ─────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                <select value={formData.department} onChange={set('department')} className={inputClass('department')}>
                  <option value="">Select department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                {errors.department && <p className="mt-1 text-xs text-red-500">{errors.department}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={formData.password}
                    onChange={set('password')} placeholder="Min. 8 chars, 1 uppercase, 1 number"
                    className={`${inputClass('password')} pr-11`} />
                  <EyeToggle show={showPassword} onToggle={() => setShowPassword(p => !p)} />
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
                <div className="relative">
                  <input type={showConfirmPassword ? 'text' : 'password'} value={formData.confirmPassword}
                    onChange={set('confirmPassword')} placeholder="Re-enter password"
                    className={`${inputClass('confirmPassword')} pr-11`} />
                  <EyeToggle show={showConfirmPassword} onToggle={() => setShowConfirmPassword(p => !p)} />
                </div>
                {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>}
              </div>

              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setStep(1)}
                  className="flex-1 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold py-2.5 rounded-lg transition-colors">
                  ← Back
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors">
                  {loading ? 'Creating...' : 'Register'}
                </button>
              </div>
            </div>
          )}
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}