import { _supabase } from './services/supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.querySelector('.carousel-container');
    const nextBtn = document.getElementById('nextSlide');
    const prevBtn = document.getElementById('prevSlide');
    
    if (!container) return;

    // Busca os slides do banco de dados
    const { data: slidesData, error } = await _supabase
        .from('carousel_slides')
        .select('*')
        .order('order_index', { ascending: true });

    // Se houver erro ou não houver slides, o carrossel não carrega
    if (error || !slidesData || slidesData.length === 0) {
        console.warn("Nenhum slide encontrado no banco.");
        return;
    }

    // Renderiza os slides dinamicamente
    container.innerHTML = slidesData.map((s, index) => `
        <div class="carousel-slide ${index === 0 ? 'active' : ''}" style="background-image: url('${s.image_url}')">
            <div class="carousel-content">
                <h1>${s.title}</h1>
                <p>${s.subtitle || ''}</p>
            </div>
        </div>
    `).join('');

    const slides = document.querySelectorAll('.carousel-slide');
    let currentSlide = 0;

    function showSlide(index) {
        if (slides.length === 0) return;
        slides.forEach(slide => slide.classList.remove('active'));
        
        if (index >= slides.length) currentSlide = 0;
        else if (index < 0) currentSlide = slides.length - 1;
        else currentSlide = index;

        slides[currentSlide].classList.add('active');
    }

    if (nextBtn) nextBtn.addEventListener('click', () => showSlide(currentSlide + 1));
    if (prevBtn) prevBtn.addEventListener('click', () => showSlide(currentSlide - 1));

    setInterval(() => {
        showSlide(currentSlide + 1);
    }, 5000);
});
