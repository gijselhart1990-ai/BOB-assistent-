import Link from 'next/link';

export type FoundationCard = {
  title: string;
  description: string;
  meta?: string;
  status?: 'Gereed' | 'Foundation' | 'Gepland' | 'Goedkeuring';
};

export function FoundationPage({ eyebrow, title, intro, cards, children }: {
  eyebrow: string;
  title: string;
  intro: string;
  cards: FoundationCard[];
  children?: React.ReactNode;
}) {
  return (
    <div className="foundation-page">
      <header className="foundation-page-head">
        <div>
          <span className="foundation-kicker">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{intro}</p>
        </div>
        <Link className="foundation-back" href="/">← Dashboard</Link>
      </header>
      <p className="empty">In ontwikkeling: dit scherm beschrijft de module. Je kunt hier nog geen taken beheren, workflows uitvoeren of een volledig auditlog bekijken.</p>
      <div className="foundation-page-grid">
        {cards.map((card) => (
          <article className="foundation-detail-card" key={card.title}>
            <span className="foundation-detail-status">{card.status ?? 'Foundation'}</span>
            <h2>{card.title}</h2>
            <p>{card.description}</p>
            {card.meta && <small>{card.meta}</small>}
          </article>
        ))}
      </div>
      {children}
    </div>
  );
}
