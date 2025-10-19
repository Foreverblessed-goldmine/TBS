// TBS Website JavaScript
// Professional construction website with mobile-first responsive design

document.addEventListener('DOMContentLoaded', function() {
    // Mobile Navigation Toggle
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    // Toggle mobile menu
    navToggle.addEventListener('click', function() {
        navMenu.classList.toggle('active');
        navToggle.classList.toggle('active');
    });

    // Close mobile menu when clicking on a link
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
        });
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(event) {
        if (!navToggle.contains(event.target) && !navMenu.contains(event.target)) {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
        }
    });

    // Smooth scrolling for navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = targetSection.offsetTop - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Contact Form Handling
    const contactForm = document.getElementById('contact-form');
    
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data
        const formData = new FormData(contactForm);
        const name = formData.get('name');
        const phone = formData.get('phone');
        const message = formData.get('message');
        
        // Basic validation
        if (!name.trim() || !phone.trim() || !message.trim()) {
            showNotification('Please fill in all fields.', 'error');
            return;
        }
        
        // Phone number validation (basic UK format)
        const phoneRegex = /^(\+44|0)[0-9]{10,11}$/;
        if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
            showNotification('Please enter a valid UK phone number.', 'error');
            return;
        }
        
        // Simulate form submission (replace with actual backend integration)
        showNotification('Thank you for your message! We\'ll get back to you soon.', 'success');
        contactForm.reset();
    });

    // Notification System
    function showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 90px;
            right: 20px;
            background-color: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            max-width: 400px;
            animation: slideInRight 0.3s ease-out;
        `;
        
        // Add to document
        document.body.appendChild(notification);
        
        // Close button functionality
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.remove();
        });
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    // Add CSS animations for notifications
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .notification-close {
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            margin-left: 10px;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .notification-close:hover {
            opacity: 0.8;
        }
    `;
    document.head.appendChild(style);

    // Header scroll effect
    const header = document.querySelector('.header');
    let lastScrollTop = 0;
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Add/remove scrolled class for styling
        if (scrollTop > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        
        lastScrollTop = scrollTop;
    });

    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // Observe elements for animation
    const animateElements = document.querySelectorAll('.service-card, .project-card, .about-text, .contact-form');
    animateElements.forEach(el => {
        observer.observe(el);
    });

    // Add animation styles
    const animationStyle = document.createElement('style');
    animationStyle.textContent = `
        .service-card,
        .project-card,
        .about-text,
        .contact-form {
            opacity: 0;
            transform: translateY(30px);
            transition: all 0.6s ease-out;
        }
        
        .service-card.animate-in,
        .project-card.animate-in,
        .about-text.animate-in,
        .contact-form.animate-in {
            opacity: 1;
            transform: translateY(0);
        }
        
        .header.scrolled {
            background-color: rgba(26, 26, 26, 0.98);
            box-shadow: 0 2px 20px rgba(0, 0, 0, 0.3);
        }
    `;
    document.head.appendChild(animationStyle);

    // Lazy loading for images (when real images are added)
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));

    // Form field enhancements
    const formInputs = document.querySelectorAll('input, textarea');
    formInputs.forEach(input => {
        // Add floating label effect
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            if (!this.value) {
                this.parentElement.classList.remove('focused');
            }
        });
        
        // Check if field has value on load
        if (input.value) {
            input.parentElement.classList.add('focused');
        }
    });

    // Add enhanced form styles
    const formStyle = document.createElement('style');
    formStyle.textContent = `
        .form-group {
            position: relative;
        }
        
        .form-group.focused label {
            color: var(--accent-blue);
            transform: translateY(-2px);
        }
        
        .form-group label {
            transition: all 0.3s ease;
        }
        
        .form-group input:focus,
        .form-group textarea:focus {
            box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
        }
    `;
    document.head.appendChild(formStyle);

    // Performance optimization: Debounce scroll events
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Optimized scroll handler
    const optimizedScrollHandler = debounce(function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }, 10);

    window.addEventListener('scroll', optimizedScrollHandler);

    // Keyboard navigation support
    document.addEventListener('keydown', function(e) {
        // ESC key closes mobile menu
        if (e.key === 'Escape') {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
        }
    });

    // Service card hover effects
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Project card click handlers (for future expansion)
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach(card => {
        card.addEventListener('click', function() {
            // Placeholder for future project modal functionality
            console.log('Project card clicked:', this.querySelector('h3').textContent);
        });
    });

    // Initialize tooltips (if needed in future)
    function initTooltips() {
        const tooltipElements = document.querySelectorAll('[data-tooltip]');
        tooltipElements.forEach(element => {
            element.addEventListener('mouseenter', showTooltip);
            element.addEventListener('mouseleave', hideTooltip);
        });
    }

    function showTooltip(e) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = e.target.dataset.tooltip;
        tooltip.style.cssText = `
            position: absolute;
            background-color: var(--primary-charcoal);
            color: var(--white);
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 1000;
            pointer-events: none;
            box-shadow: var(--shadow-md);
        `;
        
        document.body.appendChild(tooltip);
        
        const rect = e.target.getBoundingClientRect();
        tooltip.style.left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + 'px';
        tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + 'px';
    }

    function hideTooltip() {
        const tooltip = document.querySelector('.tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    // Hero Carousel Functionality
    const heroSlides = document.querySelectorAll('.hero-slide');
    const heroDots = document.querySelectorAll('.dot');
    let currentSlide = 0;
    let slideInterval;

    function showSlide(index) {
        // Remove active class from all slides and dots
        heroSlides.forEach(slide => slide.classList.remove('active'));
        heroDots.forEach(dot => dot.classList.remove('active'));
        
        // Add active class to current slide and dot
        heroSlides[index].classList.add('active');
        heroDots[index].classList.add('active');
        
        currentSlide = index;
    }

    function nextSlide() {
        const nextIndex = (currentSlide + 1) % heroSlides.length;
        showSlide(nextIndex);
    }

    function startCarousel() {
        slideInterval = setInterval(nextSlide, 5000); // Change slide every 5 seconds
    }

    function stopCarousel() {
        clearInterval(slideInterval);
    }

    // Initialize carousel
    if (heroSlides.length > 0) {
        showSlide(0);
        startCarousel();

        // Add click event listeners to dots
        heroDots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                stopCarousel();
                showSlide(index);
                startCarousel();
            });
        });

        // Pause carousel on hover
        const heroSection = document.querySelector('.hero');
        if (heroSection) {
            heroSection.addEventListener('mouseenter', stopCarousel);
            heroSection.addEventListener('mouseleave', startCarousel);
        }
    }

    // Service Activity Click Functionality
    const activityItems = document.querySelectorAll('.activity-item');
    const serviceModal = document.getElementById('serviceModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalDescription = document.getElementById('modalDescription');
    const modalTasks = document.getElementById('modalTasks');
    
    // Service data
    const serviceData = {
        'brickwork': {
            title: 'Brickwork & Masonry Services',
            description: 'Professional bricklaying and masonry work for all types of construction and renovation projects. Our skilled craftsmen deliver high-quality brickwork that combines traditional techniques with modern standards.',
            tasks: [
                'Garden wall construction',
                'Chimney repairs and rebuilding',
                'Extension brickwork',
                'Pointing and repointing',
                'Feature walls and fireplaces',
                'Boundary wall repairs'
            ]
        },
        'structural': {
            title: 'Structural Work Services',
            description: 'Essential structural modifications and repairs to ensure building safety and integrity. Our structural engineers and builders work together to deliver safe, compliant structural solutions.',
            tasks: [
                'Load-bearing wall removal',
                'Steel beam installation',
                'Foundation repairs',
                'Structural surveys',
                'Floor joist replacement',
                'Roof structure repairs'
            ]
        },
        'painting': {
            title: 'Painting & Decorating Services',
            description: 'Complete interior and exterior painting services with professional finishes and attention to detail. We transform spaces with quality paints and expert application techniques.',
            tasks: [
                'Interior room painting',
                'Exterior house painting',
                'Wallpaper hanging',
                'Woodwork and trim painting',
                'Ceiling repairs and painting',
                'Preparation and priming'
            ]
        },
        'electrical': {
            title: 'Electrical Work Services',
            description: 'Certified electrical installations, repairs, and upgrades for residential and commercial properties. All work is carried out by qualified electricians to current safety standards.',
            tasks: [
                'New socket installations',
                'Light fitting installation',
                'Consumer unit upgrades',
                'Rewiring projects',
                'Electrical safety testing',
                'Smart home installations'
            ]
        },
        'plumbing': {
            title: 'Plumbing & Heating Services',
            description: 'Complete plumbing and heating solutions from repairs to full system installations. Our certified plumbers ensure reliable water supply and efficient heating systems.',
            tasks: [
                'Bathroom installations',
                'Boiler repairs and replacement',
                'Pipe repairs and replacement',
                'Radiator installation',
                'Leak detection and repair',
                'Water pressure issues'
            ]
        },
        'extensions': {
            title: 'Extensions & Loft Conversions',
            description: 'Complete home extension and loft conversion services from planning to completion. We handle everything from initial design to final handover, ensuring full compliance with building regulations.',
            tasks: [
                'Single and double storey extensions',
                'Loft conversions with dormers',
                'Kitchen extensions',
                'Conservatory installations',
                'Planning permission assistance',
                'Building regulations compliance'
            ]
        },
        'office': {
            title: 'Office Fit-outs',
            description: 'Complete office design and construction services to create modern, functional workspaces that enhance productivity and reflect your brand identity.',
            tasks: [
                'Open plan office layouts',
                'Meeting room construction',
                'Reception area design',
                'Kitchen and break room fit-outs',
                'Partition wall installation',
                'Flooring and ceiling works'
            ]
        },
        'retail': {
            title: 'Retail Space Construction',
            description: 'Specialized retail construction services to create attractive, customer-friendly spaces that drive sales and enhance the shopping experience.',
            tasks: [
                'Shop front installations',
                'Display area construction',
                'Fitting room installations',
                'Storage and stockroom areas',
                'Customer service counters',
                'Lighting and electrical work'
            ]
        },
        'healthcare': {
            title: 'Healthcare Facility Construction',
            description: 'Specialized construction services for healthcare facilities, ensuring compliance with health and safety regulations and creating sterile, functional environments.',
            tasks: [
                'Consultation room construction',
                'Treatment room fit-outs',
                'Sterile environment installation',
                'Medical equipment integration',
                'Accessibility modifications',
                'Infection control measures'
            ]
        },
        'education': {
            title: 'Educational Building Construction',
            description: 'Construction and renovation services for schools, colleges, and educational facilities, creating safe, inspiring learning environments.',
            tasks: [
                'Classroom construction and renovation',
                'Laboratory fit-outs',
                'Library and study areas',
                'Sports facility construction',
                'Administrative office spaces',
                'Safety and security installations'
            ]
        },
        'hospitality': {
            title: 'Hospitality Construction',
            description: 'Specialized construction services for hotels, restaurants, and hospitality venues, creating welcoming spaces that enhance guest experience.',
            tasks: [
                'Hotel room renovations',
                'Restaurant kitchen installations',
                'Bar and lounge construction',
                'Conference and event spaces',
                'Guest amenity areas',
                'Outdoor dining spaces'
            ]
        },
        'industrial': {
            title: 'Industrial Construction',
            description: 'Heavy-duty construction services for industrial facilities, warehouses, and manufacturing units, designed for durability and operational efficiency.',
            tasks: [
                'Warehouse construction',
                'Manufacturing facility build-outs',
                'Loading bay installations',
                'Industrial flooring systems',
                'Heavy-duty electrical work',
                'Ventilation and extraction systems'
            ]
        },
        'construction': {
            title: 'Residential & Commercial Construction',
            description: 'Complete construction services for both residential and commercial properties. From new builds to major renovations, we deliver quality construction solutions tailored to your specific needs.',
            tasks: [
                'New build construction',
                'Property renovations',
                'Commercial fit-outs',
                'Structural modifications',
                'Building extensions',
                'Complete refurbishments'
            ]
        },
        'brickwork-structural': {
            title: 'Brickwork & Structural Work',
            description: 'Expert brickwork and structural engineering services. Our skilled craftsmen and structural engineers work together to deliver safe, durable, and aesthetically pleasing construction solutions.',
            tasks: [
                'Brickwork and masonry',
                'Structural surveys',
                'Load-bearing wall modifications',
                'Foundation work',
                'Steel beam installations',
                'Chimney repairs and construction'
            ]
        },
        'electrical-plumbing': {
            title: 'Electrical & Plumbing Services',
            description: 'Comprehensive electrical and plumbing services for residential and commercial properties. All work is carried out by qualified professionals to current safety standards.',
            tasks: [
                'Electrical installations and repairs',
                'Plumbing and heating systems',
                'Rewiring projects',
                'Bathroom installations',
                'Boiler repairs and replacement',
                'Smart home installations'
            ]
        },
        'painting-decorating': {
            title: 'Painting & Decorating',
            description: 'Professional painting and decorating services to transform your property. We use quality materials and expert techniques to deliver outstanding finishes that enhance your space.',
            tasks: [
                'Interior and exterior painting',
                'Wallpaper hanging',
                'Woodwork and trim painting',
                'Ceiling repairs and painting',
                'Preparation and priming',
                'Specialist finishes'
            ]
        },
        'landscaping': {
            title: 'Landscaping & Maintenance',
            description: 'Complete landscaping and property maintenance services. From garden design to ongoing maintenance, we help you create and maintain beautiful outdoor spaces.',
            tasks: [
                'Garden design and construction',
                'Patio and driveway installation',
                'Fencing and gates',
                'Garden maintenance',
                'Tree and hedge trimming',
                'Drainage solutions'
            ]
        },
        'planning': {
            title: 'Planning & Design Services',
            description: 'Comprehensive planning and design services to help bring your construction projects to life. From initial concepts to planning permission applications, we guide you through every step.',
            tasks: [
                'Planning permission applications',
                'Building regulations compliance',
                'Architectural design',
                'Project planning and management',
                'Site surveys and assessments',
                'Permit applications'
            ]
        },
        'garden-design': {
            title: 'Garden Design Services',
            description: 'Professional garden design services to create beautiful, functional outdoor spaces. Our landscape designers work with you to create gardens that enhance your property and lifestyle.',
            tasks: [
                'Garden layout and design',
                'Plant selection and placement',
                'Hard landscaping design',
                'Garden lighting design',
                'Water feature design',
                'Seasonal planting schemes'
            ]
        },
        'patios-driveways': {
            title: 'Patios & Driveways',
            description: 'Professional patio and driveway installation services using quality materials and expert craftsmanship. We create durable, attractive outdoor surfaces that enhance your property.',
            tasks: [
                'Patio installation',
                'Driveway construction',
                'Block paving',
                'Natural stone work',
                'Concrete and resin surfaces',
                'Drainage and edging'
            ]
        },
        'landscaping': {
            title: 'Landscaping Services',
            description: 'Complete landscaping services to transform your outdoor space. From initial design to final installation, we create beautiful, sustainable landscapes that thrive year-round.',
            tasks: [
                'Garden construction',
                'Soil preparation and improvement',
                'Planting and tree installation',
                'Lawn installation and care',
                'Mulching and ground cover',
                'Garden feature installation'
            ]
        },
        'fencing-gates': {
            title: 'Fencing & Gates',
            description: 'Professional fencing and gate installation services for security, privacy, and aesthetic appeal. We install a wide range of fencing types to suit your needs and budget.',
            tasks: [
                'Wooden fencing installation',
                'Metal and chain link fencing',
                'Garden gate installation',
                'Security gate systems',
                'Fence repairs and maintenance',
                'Custom gate design and build'
            ]
        },
        'drainage': {
            title: 'Drainage Solutions',
            description: 'Expert drainage solutions to protect your property from water damage. We design and install effective drainage systems for gardens, driveways, and building foundations.',
            tasks: [
                'Surface water drainage',
                'French drain installation',
                'Soakaway construction',
                'Gutter and downpipe systems',
                'Land drainage solutions',
                'Drainage system maintenance'
            ]
        },
        'garden-maintenance': {
            title: 'Garden Maintenance',
            description: 'Regular garden maintenance services to keep your outdoor space looking its best year-round. Our experienced gardeners provide comprehensive care for all types of gardens.',
            tasks: [
                'Regular garden maintenance',
                'Lawn care and mowing',
                'Hedge trimming and pruning',
                'Weed control and removal',
                'Seasonal garden preparation',
                'Plant health monitoring'
            ]
        },
        'planning-consent': {
            title: 'Planning Consent Services',
            description: 'Expert planning consent services to help you navigate the planning permission process. We handle all aspects of planning applications to ensure your project gets approved.',
            tasks: [
                'Planning permission applications',
                'Planning appeals and objections',
                'Pre-application consultations',
                'Planning policy advice',
                'Site assessment and analysis',
                'Community consultation support'
            ]
        },
        'design-services': {
            title: 'Design Services',
            description: 'Professional architectural and design services to bring your construction projects to life. Our experienced designers create functional, beautiful spaces that meet your needs.',
            tasks: [
                'Architectural design',
                'Interior design services',
                '3D visualization and modeling',
                'Design development',
                'Material selection and specification',
                'Design coordination and management'
            ]
        },
        'project-management': {
            title: 'Project Management',
            description: 'Comprehensive project management services to ensure your construction project is delivered on time, on budget, and to the highest standards.',
            tasks: [
                'Project planning and scheduling',
                'Budget management and cost control',
                'Contractor coordination',
                'Quality assurance and control',
                'Risk management',
                'Progress monitoring and reporting'
            ]
        },
        'building-regulations': {
            title: 'Building Regulations',
            description: 'Expert building regulations compliance services to ensure your project meets all current building standards and regulations.',
            tasks: [
                'Building regulations applications',
                'Compliance checking and advice',
                'Building control inspections',
                'Regulation updates and guidance',
                'Technical specification review',
                'Completion certificates'
            ]
        },
        'site-surveys': {
            title: 'Site Surveys',
            description: 'Comprehensive site survey services to assess your property and provide accurate information for planning and construction.',
            tasks: [
                'Topographical surveys',
                'Building condition surveys',
                'Structural surveys',
                'Environmental assessments',
                'Utility mapping',
                'Access and feasibility studies'
            ]
        },
        'cost-planning': {
            title: 'Cost Planning',
            description: 'Professional cost planning and estimation services to help you budget accurately for your construction project.',
            tasks: [
                'Initial cost estimates',
                'Detailed cost planning',
                'Value engineering',
                'Cost monitoring and control',
                'Tender analysis',
                'Final account preparation'
            ]
        },
        'repairs-maintenance': {
            title: 'Repairs & Maintenance',
            description: 'Comprehensive repair and maintenance services to keep your property in excellent condition. We provide both reactive repairs and planned maintenance programs.',
            tasks: [
                'General property repairs',
                'Preventive maintenance programs',
                'Emergency repair services',
                'Maintenance scheduling',
                'Repair cost estimation',
                'Maintenance record keeping'
            ]
        },
        'property-inspections': {
            title: 'Property Inspections',
            description: 'Thorough property inspection services to assess the condition of your building and identify any issues that need attention.',
            tasks: [
                'Condition surveys',
                'Safety inspections',
                'Compliance inspections',
                'Defect identification',
                'Inspection reports',
                'Recommendation prioritization'
            ]
        },
        'electrical-testing': {
            title: 'Electrical Testing',
            description: 'Professional electrical testing and inspection services to ensure your electrical systems are safe and compliant with current regulations.',
            tasks: [
                'Electrical safety testing',
                'PAT testing',
                'EICR inspections',
                'Electrical system maintenance',
                'Fault finding and diagnosis',
                'Compliance certification'
            ]
        },
        'plumbing-repairs': {
            title: 'Plumbing Repairs',
            description: 'Expert plumbing repair services to fix leaks, blockages, and other plumbing issues quickly and efficiently.',
            tasks: [
                'Leak detection and repair',
                'Blockage clearing',
                'Pipe repairs and replacement',
                'Fixture repairs',
                'Emergency plumbing services',
                'Plumbing system maintenance'
            ]
        },
        'roof-maintenance': {
            title: 'Roof Maintenance',
            description: 'Professional roof maintenance services to protect your property from water damage and extend the life of your roof.',
            tasks: [
                'Roof inspections',
                'Gutter cleaning and repair',
                'Tile and slate repairs',
                'Roof leak repairs',
                'Roof cleaning and treatment',
                'Preventive maintenance'
            ]
        },
        'security-systems': {
            title: 'Security Systems',
            description: 'Comprehensive security system installation and maintenance services to protect your property and provide peace of mind.',
            tasks: [
                'Security system installation',
                'CCTV system setup',
                'Alarm system maintenance',
                'Access control systems',
                'Security system upgrades',
                '24/7 monitoring services'
            ]
        },
        'concrete-work': {
            title: 'Concrete Work',
            description: 'Professional concrete work services including foundations, driveways, patios, and structural concrete elements.',
            tasks: [
                'Foundation construction',
                'Driveway installation',
                'Patio construction',
                'Concrete repairs',
                'Decorative concrete work',
                'Structural concrete elements'
            ]
        },
        'flooring-installation': {
            title: 'Flooring Installation',
            description: 'Expert flooring installation services for all types of flooring including wood, laminate, tile, and carpet.',
            tasks: [
                'Hardwood flooring',
                'Laminate flooring',
                'Tile and stone flooring',
                'Carpet installation',
                'Vinyl flooring',
                'Floor preparation and finishing'
            ]
        },
        'plastering-rendering': {
            title: 'Plastering & Rendering',
            description: 'Professional plastering and rendering services to create smooth, durable wall and ceiling finishes.',
            tasks: [
                'Internal plastering',
                'External rendering',
                'Skimming and finishing',
                'Decorative plasterwork',
                'Plaster repairs',
                'Specialist finishes'
            ]
        },
        'kitchen-bathroom-fitting': {
            title: 'Kitchen & Bathroom Fitting',
            description: 'Complete kitchen and bathroom fitting services from design to installation, creating beautiful, functional spaces.',
            tasks: [
                'Kitchen design and fitting',
                'Bathroom design and fitting',
                'Plumbing and electrical work',
                'Tiling and flooring',
                'Fixture installation',
                'Finishing and snagging'
            ]
        },
        'joinery-carpentry': {
            title: 'Joinery & Carpentry',
            description: 'Skilled joinery and carpentry services for custom woodwork, furniture, and structural elements.',
            tasks: [
                'Custom joinery',
                'Built-in furniture',
                'Doors and windows',
                'Staircases and balustrades',
                'Structural carpentry',
                'Repairs and restoration'
            ]
        },
        'hmo-conversions': {
            title: 'HMO Conversions',
            description: 'Specialized HMO (House in Multiple Occupation) conversion services to maximize rental income and comply with regulations.',
            tasks: [
                'HMO planning and design',
                'Fire safety installations',
                'Kitchen and bathroom installations',
                'Electrical and gas compliance',
                'Building regulations compliance',
                'HMO licensing support'
            ]
        }
    };
    
    activityItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            const serviceType = this.getAttribute('data-service');
            
            if (serviceData[serviceType]) {
                modalTitle.textContent = serviceData[serviceType].title;
                modalDescription.textContent = serviceData[serviceType].description;
                modalTasks.innerHTML = '';
                
                serviceData[serviceType].tasks.forEach(task => {
                    const li = document.createElement('li');
                    li.textContent = task;
                    modalTasks.appendChild(li);
                });
                
                serviceModal.classList.add('show');
            }
        });
    });
    
    // Close modal when clicking the close button
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('close-btn')) {
            serviceModal.classList.remove('show');
        }
    });
    
    // Close modal when clicking outside
    serviceModal.addEventListener('click', function(e) {
        if (e.target === serviceModal) {
            serviceModal.classList.remove('show');
        }
    });
    
    // Close modal on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            serviceModal.classList.remove('show');
        }
    });

    // Console welcome message
    console.log('%c🏗️ Tighe Building Services', 'color: #4a90e2; font-size: 20px; font-weight: bold;');
    console.log('%cProfessional Construction & HMO Conversions', 'color: #666; font-size: 14px;');
    console.log('%cWebsite loaded successfully!', 'color: #4CAF50; font-size: 12px;');
});
