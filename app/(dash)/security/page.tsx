import { FoundationPage } from '@/components/FoundationPage';

export default function Security() {
  return <FoundationPage eyebrow="BOB 1.0 · Vertrouwen" title="Security & logboek" intro="BOB werkt volgens least privilege, minimale gegevensverwerking en deny-by-default. Iedere gevoelige actie krijgt een duidelijke bron, reden en afzonderlijk akkoord." cards={[
    { title: 'Acties ter goedkeuring', description: 'Vaste controlelaag vóór versturen, wijzigen, verwijderen, plannen, publiceren, factureren of betalen.', status: 'Gereed' },
    { title: 'OAuth-kluis', description: 'Tokens alleen server-side, versleuteld opgeslagen en per account of organisatie gescheiden.', status: 'Foundation' },
    { title: 'Policy engine', description: 'Lezen, schrijven en gevoelige acties krijgen verschillende rechten en risicoregels.', status: 'Foundation' },
    { title: 'Auditlog', description: 'Wie, wat, wanneer, bron, gebruikte connector, besluit en resultaat worden herleidbaar vastgelegd.', status: 'Foundation' },
    { title: 'Data-minimalisatie', description: 'BOB bewaart verwijzingen en noodzakelijke metadata; brondata blijft zo veel mogelijk in het bronsysteem.', status: 'Gereed' },
    { title: 'Noodstop', description: 'Connectoren en workflows kunnen centraal worden gepauzeerd zonder data te verwijderen.', status: 'Gepland' },
  ]} />;
}
