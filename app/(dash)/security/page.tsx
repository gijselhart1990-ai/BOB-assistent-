import { FoundationPage } from '@/components/FoundationPage';

export default function Security() {
  return <FoundationPage eyebrow="BOB 1.0 · Vertrouwen" title="Security & logboek" intro="BOB werkt volgens least privilege, minimale gegevensverwerking en deny-by-default. Iedere gevoelige actie krijgt een duidelijke bron, reden en afzonderlijk akkoord." cards={[
    { title: 'Acties ter goedkeuring', description: 'Browsermutaties vereisen akkoord per opdracht. Een centrale goedkeuringsmodule voor alle toekomstige acties volgt nog.', status: 'Foundation' },
    { title: 'OAuth-opslag', description: 'Tokens worden server-side per gebruiker opgeslagen. Aanvullende tokenversleuteling en organisatie-isolatie zijn vervolgwerk.', status: 'Foundation' },
    { title: 'Policy engine', description: 'Lezen, schrijven en gevoelige acties krijgen verschillende rechten en risicoregels.', status: 'Foundation' },
    { title: 'Auditlog', description: 'Gepland: een volledig overzicht van uitvoerder, bron, besluit en resultaat. Dit logboek is nog niet beschikbaar.', status: 'Gepland' },
    { title: 'Data-minimalisatie', description: 'BOB bewaart verwijzingen en noodzakelijke metadata; brondata blijft zo veel mogelijk in het bronsysteem.', status: 'Gereed' },
    { title: 'Noodstop', description: 'Connectoren en workflows kunnen centraal worden gepauzeerd zonder data te verwijderen.', status: 'Gepland' },
  ]} />;
}
