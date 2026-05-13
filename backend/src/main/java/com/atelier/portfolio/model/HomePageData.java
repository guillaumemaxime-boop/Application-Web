package com.atelier.portfolio.model;
import java.util.List;
public record HomePageData(
        List<HomeCategoryView> categories,
        List<HomeExhibitionView> exhibitions,
        List<HomeFeedItem> feed
) {}
