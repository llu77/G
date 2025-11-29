// Basic JavaScript for the landing page
console.log('🏢 LMM Finance ERP v2 - Loaded Successfully!');
console.log('✨ React 19, Vite 6, Cloudflare Workers 2025');

// Add some interactive effects
document.addEventListener('DOMContentLoaded', function() {
    // Animate features on scroll
    const features = document.querySelectorAll('.feature');
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    features.forEach((feature, index) => {
        feature.style.opacity = '0';
        feature.style.transform = 'translateY(20px)';
        feature.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
        observer.observe(feature);
    });
    
    // Add click effects
    features.forEach(feature => {
        feature.addEventListener('click', function() {
            this.style.transform = 'scale(1.05)';
            setTimeout(() => {
                this.style.transform = 'translateY(-5px)';
            }, 200);
        });
    });
    
    // Add typing effect to title
    const title = document.querySelector('h1');
    if (title) {
        const originalText = title.textContent;
        title.textContent = '';
        
        let i = 0;
        const typeWriter = () => {
            if (i < originalText.length) {
                title.textContent += originalText.charAt(i);
                i++;
                setTimeout(typeWriter, 100);
            }
        };
        
        setTimeout(typeWriter, 500);
    }
});

// Add performance monitoring
if ('performance' in window) {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            console.log('📊 Performance Metrics:');
            console.log(`- Load Time: ${perfData.loadEventEnd - perfData.loadEventStart}ms`);
            console.log(`- DOM Content Loaded: ${perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart}ms`);
        }, 0);
    });
}

// Add error handling
window.addEventListener('error', (e) => {
    console.error('❌ Error occurred:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('❌ Unhandled promise rejection:', e.reason);
});

// Add some fun interactions
let clickCount = 0;
document.addEventListener('click', () => {
    clickCount++;
    if (clickCount % 10 === 0) {
        console.log(`🎉 You've clicked ${clickCount} times! Keep exploring!`);
    }
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K for search (placeholder)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        console.log('🔍 Search feature coming soon!');
    }
    
    // Escape to clear console
    if (e.key === 'Escape') {
        console.clear();
        console.log('🧹 Console cleared!');
    }
});

console.log('🎯 LMM Finance ERP v2 is ready for deployment!');
console.log('📦 Built with: React, Vite, Cloudflare Workers');
console.log('🔧 Features: Routing, API, Security, Performance');