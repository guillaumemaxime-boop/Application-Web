package com.atelier.portfolio.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Active le traitement asynchrone (transcodage video). Pool borné : un seul
 * backend single-tenant, le transcodage est CPU-lourd — on limite le parallélisme
 * pour ne pas saturer l'instance Railway. Le transcodage lui-même tourne dans un
 * process ffmpeg externe (pas dans le heap JVM).
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "videoExecutor")
    public Executor videoExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(1);
        executor.setQueueCapacity(10);
        executor.setThreadNamePrefix("video-");
        executor.initialize();
        return executor;
    }
}
