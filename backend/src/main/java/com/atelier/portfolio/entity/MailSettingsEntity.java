package com.atelier.portfolio.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "mail_settings")
public class MailSettingsEntity {

    public static final String DEFAULT_ID = "default";

    @Id
    @Column(length = 20)
    private String id;

    @Column(name = "from_address", length = 300)
    private String fromAddress;

    @Column(name = "to_address", length = 300)
    private String toAddress;

    @Column(name = "updated_at", nullable = false, length = 50)
    private String updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getFromAddress() { return fromAddress; }
    public void setFromAddress(String fromAddress) { this.fromAddress = fromAddress; }

    public String getToAddress() { return toAddress; }
    public void setToAddress(String toAddress) { this.toAddress = toAddress; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
