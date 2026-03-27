import { Link } from 'react-router-dom';
import { useTranslation } from '../../lib/i18n/hook';

export default function Landing() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">{t('landing.brand')}</h1>
        <nav className="flex gap-4">
          <Link to="/demande" className="text-sm text-muted-foreground hover:text-foreground">
            {t('landing.serviceRequest')}
          </Link>
          <Link
            to="/login"
            className="text-sm px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            {t('landing.login')}
          </Link>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-24 text-center">
        <h2 className="text-4xl font-bold mb-6">
          {t('landing.hero')}
        </h2>
        <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
          {t('landing.heroSubtitle')}
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/demande"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-md text-lg font-medium hover:bg-primary/90"
          >
            {t('landing.submitRequest')}
          </Link>
          <Link
            to="/login"
            className="px-6 py-3 border border-input rounded-md text-lg font-medium hover:bg-accent"
          >
            {t('landing.signIn')}
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24">
          <div className="p-6 bg-card border rounded-lg">
            <h3 className="font-semibold mb-2">{t('landing.feature1Title')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('landing.feature1Desc')}
            </p>
          </div>
          <div className="p-6 bg-card border rounded-lg">
            <h3 className="font-semibold mb-2">{t('landing.feature2Title')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('landing.feature2Desc')}
            </p>
          </div>
          <div className="p-6 bg-card border rounded-lg">
            <h3 className="font-semibold mb-2">{t('landing.feature3Title')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('landing.feature3Desc')}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
