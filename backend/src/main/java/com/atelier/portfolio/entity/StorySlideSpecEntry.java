package com.atelier.portfolio.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class StorySlideSpecEntry {
    @Column(nullable = false, length = 100)
    private String label;

    @Column(name = "entry_value", nullable = false, length = 200)
    private String value;

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }
}
