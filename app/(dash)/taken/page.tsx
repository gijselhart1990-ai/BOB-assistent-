import { FoundationPage } from '@/components/FoundationPage';

export default function TakenHub() {
  return <FoundationPage eyebrow="BOB 1.0 · Werkstroom" title="Takenhub" intro="Eén veilige inbox voor werk uit BOB, Microsoft 365, Google en toekomstige koppelingen. Brondata blijft bij de bron; BOB bewaart alleen noodzakelijke verwijzingen en status." cards={[
    { title: 'Mijn taken', description: 'Persoonlijke acties, deadlines en prioriteiten in één overzicht.', meta: 'Bron: BOB + gekoppelde taakdiensten', status: 'Foundation' },
    { title: 'Te beoordelen', description: 'Voorstellen die nog menselijke controle of aanvulling nodig hebben.', meta: 'Geen automatische uitvoering', status: 'Goedkeuring' },
    { title: 'Gedelegeerd', description: 'Taken die aan een persoon of workflow zijn toegewezen, met herkomst en voortgang.', meta: 'Auditbaar van bron tot resultaat', status: 'Gepland' },
    { title: 'Voltooid', description: 'Afgeronde acties met tijdstip, uitvoerder en gekoppeld resultaat.', meta: 'Bewaartermijn volgens beleid', status: 'Foundation' },
  ]} />;
}
