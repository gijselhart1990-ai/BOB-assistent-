# Modules

## AI-orchestrator

Verwerkt tekst of push-to-talk naar `Intent → Context → Plan → Policy check → Tool call → Resultaat → Audit`. Bij ontbrekende of tegenstrijdige gegevens vraagt BOB door. Inhoud uit websites, mail en documenten is data en nooit een systeeminstructie.

## Takenhub

Combineert eigen BOB-taken met verwijzingen naar Microsoft To Do, Outlook, Google Tasks en latere taakbronnen. Een taak bewaart bron, eigenaar, organisatie, deadline, status en afhankelijkheden. Afronden of delegeren is een schrijfactie en vraagt akkoord.

## Microsoft 365

De connectorlaag omvat Outlook Mail, Calendar, Contacts, OneDrive, Teams en Microsoft To Do. Foundation gebruikt gedelegeerde OAuth-scopes en vraagt alleen de minimaal benodigde rechten. Lezen en schrijven krijgen afzonderlijke scopes en policies.

## Google multi-accountmanager

Een gebruiker kan meerdere Google-accounts koppelen. Iedere `Connection` krijgt een eigen account-ID, label, organisatie, scopes, tokenversie en synchronisatiestatus. BOB kiest nooit stilzwijgend een account bij versturen of plannen; het gekozen afzenderaccount staat in het goedkeuringsverzoek.

## Administratie & SnelStart

Leest klanten, artikelen en relevante boekingscontext en maakt daarna een conceptfactuur. Definitief maken en verzenden zijn afzonderlijke goedkeuringsstappen. Bankbetalingen en automatische incasso vallen buiten Foundation.

## Workflow Builder

Versiebeheer voor triggers, controles, acties, beslissingen, approvals en foutpaden. Een actieve workflowrun blijft gekoppeld aan de exacte gepubliceerde workflowversie.

## Security & logboek

Beheert rollen, scopes, policies, goedkeuringen, audit, bewaartermijnen, connectorstatus en noodstop. Geheime waarden worden nooit naar de browser of het logboek geschreven.

## Overige modules

WhatsApp, Social Media en Web Assistent blijven geïsoleerde connectors. Cliënten & Organisaties wordt de gedeelde domeincontext, zonder onnodige kopieën van dossiers of gezondheidsgegevens.
