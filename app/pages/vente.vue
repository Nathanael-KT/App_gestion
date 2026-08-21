<!-- eslint-disable vue/html-self-closing -->
<!-- eslint-disable vue/attributes-order -->
<template>
  <div class="vente-page pro">
    <!-- Hero Section -->
    <section class="hero">
      <div class="container">
        <div class="hero-content">
          <h1 class="main-title">App Gestion</h1>
          <p class="subtitle">
            La solution tout-en-un pour optimiser votre entreprise
          </p>
          <div class="hero-details">
            <p>
              Centralisez <strong>ventes, stock, clients et finances</strong> dans une plateforme unique.<br>
              Gagnez en <strong>efficacité, fiabilité et sérénité</strong> au quotidien.
            </p>
          </div>
          <div class="cta-buttons">
            <button class="btn-primary" @click="goToDemo">
              Démarrer l'essai gratuit
            </button>
            <button class="btn-secondary" @click="scrollToFeatures">
              Découvrir les fonctionnalités
            </button>
          </div>
        </div>
        <div class="hero-visual">
          <div class="dashboard-preview">
            <div class="browser-window">
              <div class="dashboard-content">
                <div class="dashboard-header">
                  <div class="metric">
                    <small>Chiffre d'affaires</small>
                    <strong>€42,580</strong>
                  </div>
                  <div class="metric">
                    <small>Ventes du mois</small>
                    <strong>128</strong>
                  </div>
                  <div class="metric">
                    <small>Clients actifs</small>
                    <strong>74</strong>
                  </div>
                </div>
                <div class="chart-placeholder" />
            </div>
          </div>
        </div>
      </div>
      <div class="hero-solutions">
        <ul>
          <li>
            <span class="icon">🚀</span> Automatisation des processus
          </li>
          <li><span class="icon">📊</span> Tableaux de bord personnalisables</li>
          <li>
            <span class="icon">🔒</span> Sécurité de niveau bancaire
          </li>
          <li><span class="icon">🤝</span> Collaboration en temps réel</li>
          <li><span class="icon">⚡</span> Support réactif 7j/7</li>
        </ul>
      </div>
    </div></section>

    <!-- Features Section -->
    <section class="features" id="features">
      <div class="container">
        <h2>Fonctionnalités avancées</h2>
        <p class="section-description">Découvrez comment App Gestion transforme votre gestion d'entreprise</p>
        
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">💼</div>
            <h3>Ventes & Facturation</h3>
            <p>
              Créez, suivez et analysez vos ventes, générez des factures professionnelles,
              gérez les paiements et automatisez les relances.
            </p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">📦</div>
            <h3>Gestion du Stock</h3>
            <p>
              Inventaire en temps réel, alertes de seuil, mouvements automatisés,
              historique complet et valorisation précise.
            </p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">📈</div>
            <h3>Analytics & Reporting</h3>
            <p>
              Tableaux de bord interactifs, indicateurs clés de performance,
              exports personnalisables et prévisions avancées.
            </p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">👥</div>
            <h3>Gestion d'équipe</h3>
            <p>
              Gestion fine des rôles et permissions, accès personnalisés,
              journal d'activité détaillé et authentification sécurisée.
            </p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">⚙️</div>
            <h3>Personnalisation</h3>
            <p>
              Adaptez l'application à vos processus métier : produits, taxes,
              devises, notifications et bien plus.
            </p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🔌</div>
            <h3>Intégrations</h3>
            <p>
              Connectez vos outils existants : comptabilité, e-commerce,
              marketplaces et services de livraison.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Process Section -->
    <section class="process">
      <div class="container">
        <h2>Simple et efficace</h2>
        <p class="section-description">Une mise en place rapide pour des résultats immédiats</p>
        
        <div class="process-steps">
          <div class="step">
            <div class="step-number">1</div>
            <h3>Inscription express</h3>
            <p>Créez votre compte en moins de 2 minutes, sans engagement.</p>
          </div>
          <div class="step">
            <div class="step-number">2</div>
            <h3>Configuration guidée</h3>
            <p>Paramétrez facilement votre entreprise, produits et équipe.</p>
          </div>
          <div class="step">
            <div class="step-number">3</div>
            <h3>Importez vos données</h3>
            <p>Migrez en un clic vos clients, produits et historique.</p>
          </div>
          <div class="step">
            <div class="step-number">4</div>
            <h3>Formation et support</h3>
            <p>Notre équipe vous accompagne pour une prise en main rapide.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Testimonials Section -->
    <section class="testimonials">
      <div class="container">
        <h2>Ils nous font confiance</h2>
        <p class="section-description">Rejoignez les centaines d'entreprises qui optimisent leur gestion</p>
        
        <div class="testimonials-grid">
          <div class="testimonial-card">
            <div class="testimonial-content">
              <p>
                « App Gestion a transformé notre organisation : tout est plus simple,
                rapide et fiable. Nous avons gagné 15 heures par semaine ! »
              </p>
            </div>
            <div class="testimonial-author">
              <div class="author-avatar"></div>
              <div class="author-details">
                <strong>Entreprise Alpha</strong>
                <span>Commerce de détail</span>
              </div>
            </div>
          </div>
          <div class="testimonial-card">
            <div class="testimonial-content">
              <p>
                « Un outil indispensable pour le suivi des ventes et du stock.
                L'analyse des performances a boosté notre chiffre d'affaires de 22%. »
              </p>
            </div>
            <div class="testimonial-author">
              <div class="author-avatar"></div>
              <div class="author-details">
                <strong>Magasin Beta</strong>
                <span>Vente multi-canal</span>
              </div>
            </div>
          </div>
          <div class="testimonial-card">
            <div class="testimonial-content">
              <p>
                « L'interface est intuitive, les rapports ultra complets et le support
                toujours disponible. Exactement ce dont nous avions besoin. »
              </p>
            </div>
            <div class="testimonial-author">
              <div class="author-avatar"></div>
              <div class="author-details">
                <strong>Gestionnaire Gamma</strong>
                <span>Services aux entreprises</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
      <div class="container">
        <h2>Prêt à transformer votre gestion d'entreprise?</h2>
        <p>Rejoignez nos clients satisfaits et optimisez vos processus dès aujourd'hui</p>
        <div class="cta-buttons">
          <button class="btn-primary" @click="goToDemo">
            Essai gratuit 30 jours
          </button>
          <button class="btn-secondary" @click="scrollToContact">
            Contacter un expert
          </button>
        </div>
      </div>
    </section>

    <!-- Contact Section -->
    <section class="contact" id="contact">
      <div class="container">
        <div class="contact-content">
          <h2>Une question?<br>Contactez-nous</h2>
          <p>
            Notre équipe est à votre disposition pour une démonstration personnalisée
            ou répondre à toutes vos questions.
          </p>
          <div class="contact-info">
            <div class="contact-item">
              <span class="contact-icon">📧</span>
              <a href="mailto:contact@appgestion.com">contact@appgestion.com</a>
            </div>
            <div class="contact-item">
              <span class="contact-icon">📞</span>
              <a href="tel:+33123456789">+33 1 23 45 67 89</a>
            </div>
            <div class="contact-item">
              <span class="contact-icon">🕒</span>
              <span>Support 7j/7 de 9h à 19h</span>
            </div>
          </div>
        </div>
        <div class="contact-form">
          <h3>Demander une démo</h3>
          <form @submit.prevent="submitForm">
            <div class="form-group">
              <input type="text" placeholder="Nom complet" required>
            </div>
            <div class="form-group">
              <input type="email" placeholder="Adresse email" required>
            </div>
            <div class="form-group">
              <input type="text" placeholder="Entreprise">
            </div>
            <div class="form-group">
              <textarea placeholder="Comment pouvons-nous vous aider?" rows="3"></textarea>
            </div>
            <button type="submit" class="btn-primary">Envoyer la demande</button>
          </form>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
definePageMeta({ layout: "sansmenu" });
const router = useRouter();

function goToDemo() {
  router.push("/login");
}

function scrollToFeatures() {
  const featuresSection = document.getElementById('features');
  if (featuresSection) {
    featuresSection.scrollIntoView({ behavior: 'smooth' });
  }
}

function scrollToContact() {
  const contactSection = document.getElementById('contact');
  if (contactSection) {
    contactSection.scrollIntoView({ behavior: 'smooth' });
  }
}

function submitForm() {
  // Logique de soumission du formulaire
  // console.log('Formulaire soumis');
}
</script>

<style scoped>
/* Variables et reset */
.vente-page.pro {
  --primary: #2563eb;
  --primary-dark: #1d4ed8;
  --secondary: #64748b;
  --light: #f8fafc;
  --dark: #1e293b;
  --accent: #6366f1;
  --success: #10b981;
  --border: #e2e8f0;
  --shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
  --radius: 12px;
  
  width: 100%;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  color: var(--dark);
  line-height: 1.6;
  overflow-x: hidden;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

/* Hero Section */
.hero {
  padding: 4rem 0 2rem;
  background: linear-gradient(to bottom, #f8fafc, #ffffff);
  position: relative;
}

.hero > .container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: center;
}

.hero-content {
  padding-right: 2rem;
}

.main-title {
  font-size: 3.5rem;
  font-weight: 800;
  background: linear-gradient(to right, var(--primary), var(--accent));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin-bottom: 1rem;
  line-height: 1.2;
}

.subtitle {
  font-size: 1.5rem;
  color: var(--secondary);
  margin-bottom: 1.5rem;
  font-weight: 500;
}

.hero-details {
  margin-bottom: 2rem;
}

.hero-details p {
  font-size: 1.1rem;
  color: var(--secondary);
  line-height: 1.6;
}

.cta-buttons {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.btn-primary {
  background: linear-gradient(to right, var(--primary), var(--accent));
  color: white;
  border: none;
  padding: 0.875rem 2rem;
  border-radius: var(--radius);
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: var(--shadow);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 25px -5px rgba(37, 99, 235, 0.2);
}

.btn-secondary {
  background: white;
  color: var(--primary);
  border: 1px solid var(--border);
  padding: 0.875rem 2rem;
  border-radius: var(--radius);
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  border-color: var(--primary);
  background: #f1f5f9;
}

.hero-visual {
  display: flex;
  justify-content: center;
  align-items: center;
}

.dashboard-preview {
  width: 100%;
  max-width: 500px;
}

.browser-window {
  background: white;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.browser-controls {
  padding: 1rem;
  background: #f1f5f9;
  display: flex;
  gap: 0.5rem;
}

.browser-controls span {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #94a3b8;
}

.browser-controls span:first-child {
  background: #ef4444;
}

.browser-controls span:nth-child(2) {
  background: #f59e0b;
}

.browser-controls span:last-child {
  background: #10b981;
}

.dashboard-content {
  padding: 1.5rem;
}

.dashboard-header {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.metric {
  background: #f8fafc;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
}

.metric small {
  display: block;
  color: var(--secondary);
  font-size: 0.75rem;
  margin-bottom: 0.25rem;
}

.metric strong {
  font-size: 1.25rem;
  color: var(--dark);
}

.chart-placeholder {
  height: 200px;
  background: linear-gradient(45deg, #f1f5f9, #e2e8f0);
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.chart-placeholder::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.hero-solutions {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border);
}

.hero-solutions ul {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 2rem;
  list-style: none;
  padding: 0;
}

.hero-solutions li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
}

/* Features Section */
.features {
  padding: 5rem 0;
  background: white;
}

.features h2 {
  text-align: center;
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--dark);
  margin-bottom: 1rem;
}

.section-description {
  text-align: center;
  color: var(--secondary);
  max-width: 600px;
  margin: 0 auto 3rem;
  font-size: 1.1rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.feature-card {
  background: var(--light);
  padding: 2rem;
  border-radius: var(--radius);
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.feature-card:hover {
  transform: translateY(-5px);
  border-color: var(--primary);
  box-shadow: var(--shadow);
}

.feature-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.feature-card h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--dark);
}

.feature-card p {
  color: var(--secondary);
}

/* Process Section */
.process {
  padding: 5rem 0;
  background: #f1f5f9;
}

.process h2 {
  text-align: center;
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--dark);
  margin-bottom: 1rem;
}

.process-steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-top: 3rem;
}

.step {
  text-align: center;
  padding: 2rem;
  background: white;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.step-number {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  margin: 0 auto 1.5rem;
  font-size: 1.25rem;
}

.step h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--dark);
}

.step p {
  color: var(--secondary);
}

/* Testimonials Section */
.testimonials {
  padding: 5rem 0;
  background: white;
}

.testimonials h2 {
  text-align: center;
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--dark);
  margin-bottom: 1rem;
}

.testimonials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 3rem;
}

.testimonial-card {
  background: var(--light);
  padding: 2rem;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.testimonial-content {
  margin-bottom: 1.5rem;
}

.testimonial-content p {
  font-style: italic;
  color: var(--dark);
  line-height: 1.6;
}

.testimonial-author {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.author-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #cbd5e1;
}

.author-details {
  display: flex;
  flex-direction: column;
}

.author-details strong {
  color: var(--dark);
}

.author-details span {
  color: var(--secondary);
  font-size: 0.875rem;
}

/* CTA Section */
.cta-section {
  padding: 5rem 0;
  background: linear-gradient(to right, var(--primary), var(--accent));
  color: white;
  text-align: center;
}

.cta-section h2 {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.cta-section p {
  font-size: 1.2rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.cta-section .btn-primary {
  background: white;
  color: var(--primary);
}

.cta-section .btn-secondary {
  background: transparent;
  color: white;
  border-color: white;
}

.cta-section .btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* Contact Section */
.contact {
  padding: 5rem 0;
  background: var(--light);
}

.contact > .container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
}

.contact-content h2 {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--dark);
  margin-bottom: 1.5rem;
}

.contact-content p {
  color: var(--secondary);
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

.contact-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.contact-icon {
  font-size: 1.5rem;
}

.contact-item a {
  color: var(--primary);
  text-decoration: none;
  transition: color 0.2s;
}

.contact-item a:hover {
  color: var(--primary-dark);
}

.contact-form {
  background: white;
  padding: 2.5rem;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.contact-form h3 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: var(--dark);
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.875rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-family: inherit;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary);
}

/* Responsive Design */
@media (max-width: 968px) {
  .hero > .container {
    grid-template-columns: 1fr;
    text-align: center;
  }
  
  .hero-content {
    padding-right: 0;
  }
  
  .main-title {
    font-size: 2.5rem;
  }
  
  .contact > .container {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .cta-buttons {
    flex-direction: column;
  }
  
  .hero-solutions ul {
    flex-direction: column;
    gap: 1rem;
  }
  
  .process-steps {
    grid-template-columns: 1fr;
  }
}
</style>