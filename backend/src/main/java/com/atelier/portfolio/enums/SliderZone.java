package com.atelier.portfolio.enums;

import java.util.Arrays;

public enum SliderZone {
    HOME_TOP("home-top"),
    HOME_MIDDLE("home-middle"),
    HOME_BOTTOM("home-bottom");

    private final String key;

    SliderZone(String key) { this.key = key; }

    public String getKey() { return key; }

    public static SliderZone fromKey(String key) {
        return Arrays.stream(values())
                .filter(z -> z.key.equals(key))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown zone key: " + key));
    }
}
