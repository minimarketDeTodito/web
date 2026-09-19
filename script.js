const header=document.querySelector('.site-header');
const progress=document.querySelector('.scroll-progress');
const menuBtn=document.querySelector('.menu-toggle');
const navLinks=document.querySelector('.nav-links');

function onScroll(){
  const y=window.scrollY;
  header?.classList.toggle('scrolled',y>10);
  const max=document.documentElement.scrollHeight-window.innerHeight;
  if(progress)progress.style.width=`${max>0?(y/max)*100:0}%`;
}
window.addEventListener('scroll',onScroll,{passive:true});
onScroll();

const io=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      entry.target.classList.add('in-view');
      io.unobserve(entry.target);
    }
  });
},{threshold:.12,rootMargin:'0px 0px -40px 0px'});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

menuBtn?.addEventListener('click',()=>{
  const open=navLinks.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded',String(open));
});
navLinks?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
  navLinks.classList.remove('open');
  menuBtn?.setAttribute('aria-expanded','false');
}));




// V13 · WhatsApp order modal — robust initialization
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('order-modal');
  const openBtn = document.getElementById('open-order-modal');

  if (!modal || !openBtn) return;

  const closeBtn = modal.querySelector('.order-modal-close');
  const closeTargets = modal.querySelectorAll('[data-close-order-modal]');

  const openModal = () => {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    window.setTimeout(() => {
      closeBtn?.focus();
    }, 30);
  };

  const closeModal = () => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    openBtn.focus();
  };

  openBtn.addEventListener('click', (event) => {
    event.preventDefault();
    openModal();
  });

  closeTargets.forEach((element) => {
    element.addEventListener('click', closeModal);
  });

  modal.querySelector('.order-modal-cta')?.addEventListener('click', () => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) {
      closeModal();
    }
  });
});


// V15 · Service accordion: only one group open at a time.
document.addEventListener('DOMContentLoaded', () => {
  const serviceAccordions = Array.from(document.querySelectorAll('.partner-accordion'));
  if (!serviceAccordions.length) return;

  serviceAccordions.forEach((item) => {
    item.addEventListener('toggle', () => {
      if (!item.open) return;
      serviceAccordions.forEach((other) => {
        if (other !== item) other.open = false;
      });
    });
  });
});
