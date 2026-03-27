import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useToast } from '../../hooks/use-toast';
import { useTranslation } from '../../lib/i18n/hook';
import { SERVICE_CATEGORY_LABELS, SERVICE_MODE_LABELS, PRIORITY_LABELS } from '../../lib/constants';

export default function ServiceRequest() {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  // Form field state with sensible defaults
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [serviceCategory, setServiceCategory] = useState('REPARATION');
  const [serviceMode, setServiceMode] = useState('SUR_ROUTE');
  const [priority, setPriority] = useState('NORMALE');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mutation to create the ticket via the public service request endpoint
  const mutation = useMutation({
    mutationFn: () =>
      api.serviceRequest.create({
        title,
        description,
        priority,
        serviceCategory,
        serviceMode,
        customerEmail: email,
        customerFirstName: firstName,
        customerLastName: lastName,
        customerPhone: phone,
      }),
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error: Error) => {
      toast.error(error.message || t('serviceRequest.errorSubmit'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = t('validation.firstNameRequired');
    if (!lastName.trim()) newErrors.lastName = t('validation.lastNameRequired');
    if (!email.trim()) {
      newErrors.email = t('validation.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = t('validation.emailInvalid');
    }
    if (!title.trim()) newErrors.title = t('validation.titleRequired');
    if (!description.trim()) newErrors.description = t('validation.descriptionRequired');
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    mutation.mutate();
  };

  // Success view — kept from original
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <div className="bg-card border rounded-lg p-8 shadow-sm text-center max-w-md">
          <div className="text-green-500 text-4xl mb-4">✓</div>
          <h2 className="text-xl font-bold mb-2">{t('serviceRequest.submitted')}</h2>
          <p className="text-muted-foreground mb-4">
            {t('serviceRequest.submittedMessage')}
          </p>
          <Link to="/" className="text-primary hover:underline text-sm">
            {t('serviceRequest.backHome')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/50">
      <header className="bg-card border-b px-4 py-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-xl font-bold text-primary">{t('landing.brand')}</Link>
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
            {t('auth.login')}
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">{t('serviceRequest.title')}</h1>

        <form
          onSubmit={handleSubmit}
          className="bg-card border rounded-lg p-6 space-y-4"
        >
          {/* Inline error banner when mutation fails */}
          {mutation.isError && (
            <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
              {mutation.error?.message || t('serviceRequest.errorSubmit')}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('serviceRequest.firstName')}</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => { setFirstName(e.target.value); setErrors((prev) => { const { firstName: _, ...rest } = prev; return rest; }); }}
                className={`w-full rounded-md border ${errors.firstName ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm`}
              />
              {errors.firstName && <p className="text-sm text-destructive mt-1">{errors.firstName}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('serviceRequest.lastName')}</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => { setLastName(e.target.value); setErrors((prev) => { const { lastName: _, ...rest } = prev; return rest; }); }}
                className={`w-full rounded-md border ${errors.lastName ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm`}
              />
              {errors.lastName && <p className="text-sm text-destructive mt-1">{errors.lastName}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('serviceRequest.email')}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((prev) => { const { email: _, ...rest } = prev; return rest; }); }}
              className={`w-full rounded-md border ${errors.email ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm`}
            />
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('serviceRequest.phone')}</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('serviceRequest.ticketTitle')}</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => { setTitle(e.target.value); setErrors((prev) => { const { title: _, ...rest } = prev; return rest; }); }}
              className={`w-full rounded-md border ${errors.title ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm`}
            />
            {errors.title && <p className="text-sm text-destructive mt-1">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('serviceRequest.description')}</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => { setDescription(e.target.value); setErrors((prev) => { const { description: _, ...rest } = prev; return rest; }); }}
              className={`w-full rounded-md border ${errors.description ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm resize-none`}
            />
            {errors.description && <p className="text-sm text-destructive mt-1">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('serviceRequest.category')}</label>
              <select
                value={serviceCategory}
                onChange={(e) => setServiceCategory(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {Object.entries(SERVICE_CATEGORY_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('serviceRequest.priority')}</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('serviceRequest.serviceMode')}</label>
            <select
              value={serviceMode}
              onChange={(e) => setServiceMode(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {Object.entries(SERVICE_MODE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? t('serviceRequest.submitting') : t('serviceRequest.submit')}
          </button>
        </form>
      </main>
    </div>
  );
}
