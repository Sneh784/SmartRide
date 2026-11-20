package com.smartride.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class ApprovalEmailEventListener {
    private static final Logger LOGGER = LoggerFactory.getLogger(ApprovalEmailEventListener.class);
    private final ApprovalEmailNotificationService notifications;

    public ApprovalEmailEventListener(ApprovalEmailNotificationService notifications) {
        this.notifications = notifications;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void deliverAfterCommit(ApprovalEmailQueued event) {
        try {
            notifications.deliver(event.notificationId());
        } catch (RuntimeException exception) {
            LOGGER.error("Could not process approval email notification {} after approval commit",
                    event.notificationId(), exception);
        }
    }
}
