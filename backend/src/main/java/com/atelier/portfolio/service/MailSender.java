package com.atelier.portfolio.service;

/**
 * Port d'envoi de mail transactionnel. Découple le domaine du fournisseur
 * concret (adapter {@link ResendMailService}). Introduit par l'ADR-0022 :
 * la dépendance mail a déjà changé une fois (SMTP → Resend), ce port dé-risque
 * un futur changement de fournisseur.
 */
public interface MailSender {

    /** true si un fournisseur est configuré (clé API présente) ; false en mode dégradé. */
    boolean isConfigured();

    /**
     * Envoie un email. Retourne true si le fournisseur a accepté le message,
     * false sinon (mode dégradé OU erreur). Ne propage jamais d'exception.
     */
    boolean send(String from, String to, String replyTo, String subject, String body);
}
