import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">Valitek</h1>
        <nav className="flex gap-4">
          <Link to="/demande" className="text-sm text-muted-foreground hover:text-foreground">
            Demande de service
          </Link>
          <Link
            to="/login"
            className="text-sm px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Connexion
          </Link>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-24 text-center">
        <h2 className="text-4xl font-bold mb-6">
          Gestion de billets IT simplifiee
        </h2>
        <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
          Soumettez vos demandes de service, suivez l'avancement de vos billets
          et planifiez vos rendez-vous en toute simplicite.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/demande"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-md text-lg font-medium hover:bg-primary/90"
          >
            Soumettre une demande
          </Link>
          <Link
            to="/login"
            className="px-6 py-3 border border-input rounded-md text-lg font-medium hover:bg-accent"
          >
            Se connecter
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24">
          <div className="p-6 bg-card border rounded-lg">
            <h3 className="font-semibold mb-2">Suivi en temps reel</h3>
            <p className="text-sm text-muted-foreground">
              Suivez l'etat de vos billets a chaque etape du processus
            </p>
          </div>
          <div className="p-6 bg-card border rounded-lg">
            <h3 className="font-semibold mb-2">Planification facile</h3>
            <p className="text-sm text-muted-foreground">
              Planifiez vos rendez-vous selon les disponibilites
            </p>
          </div>
          <div className="p-6 bg-card border rounded-lg">
            <h3 className="font-semibold mb-2">Communication directe</h3>
            <p className="text-sm text-muted-foreground">
              Echangez avec votre technicien directement dans le billet
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
