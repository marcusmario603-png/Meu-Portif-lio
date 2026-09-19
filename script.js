(function(){
  var sections = ['inicio','sobre','projetos','contato'];
  var current = 0;
  var isAnimating = false;
  var COOLDOWN = 980;

  var sectionEls = sections.map(function(id){ return document.getElementById(id); });
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-link'));
  var segEls = Array.prototype.slice.call(document.querySelectorAll('.nav-progress .seg'));
  var tunnelFx = document.getElementById('tunnelFx');

  function clearStates(el){
    el.classList.remove('active', 'state-behind', 'state-front');
  }

  function updateChrome(){
    navLinks.forEach(function(link){
      link.classList.toggle('active', link.dataset.target === sections[current]);
    });
    segEls.forEach(function(seg, i){
      seg.classList.toggle('active', i === current);
    });
    if(history.replaceState){
      history.replaceState(null, '', '#' + sections[current]);
    }
  }

  function firePulse(direction){
    tunnelFx.classList.remove('pulse-fwd', 'pulse-back');
    // força reflow para permitir reativar a mesma animação em sequência
    void tunnelFx.offsetWidth;
    tunnelFx.classList.add(direction === 'fwd' ? 'pulse-fwd' : 'pulse-back');
  }

  function initPlacement(){
    sectionEls.forEach(function(el, i){
      clearStates(el);
      if(i === current) el.classList.add('active');
      else if(i < current) el.classList.add('state-front');
      else el.classList.add('state-behind');
    });
    updateChrome();
  }

  function goTo(index){
    if(index < 0 || index >= sections.length) return;
    if(index === current) return;
    if(isAnimating) return;
    isAnimating = true;

    var forward = index > current;
    var oldEl = sectionEls[current];
    var newEl = sectionEls[index];

    firePulse(forward ? 'fwd' : 'back');

    // a seção que sai "atravessa" a câmera (fica perto e some) ao avançar,
    // ou recua para longe (fica pequena e some) ao voltar
    clearStates(oldEl);
    oldEl.classList.add(forward ? 'state-front' : 'state-behind');

    // posiciona a seção que entra do lado oposto, sem transição, e no próximo frame
    // libera para o estado ativo — isso gera a sensação de vir emergindo de longe (avançar)
    // ou se aproximando de perto (voltar)
    newEl.style.transition = 'none';
    clearStates(newEl);
    newEl.classList.add(forward ? 'state-behind' : 'state-front');
    void newEl.offsetWidth;
    newEl.style.transition = '';

    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        clearStates(newEl);
        newEl.classList.add('active');
        newEl.scrollTop = 0;
      });
    });

    current = index;
    updateChrome();
    setTimeout(function(){ isAnimating = false; }, COOLDOWN);
  }

  function next(){ goTo(current + 1); }
  function prev(){ goTo(current - 1); }

  // Wheel navigation
  var wheelAccum = 0;
  window.addEventListener('wheel', function(e){
    e.preventDefault();
    if(isAnimating) return;
    if(Math.abs(e.deltaY) < 8) return;
    if(e.deltaY > 0) next(); else prev();
  }, { passive:false });

  // Keyboard navigation
  window.addEventListener('keydown', function(e){
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    if(tag === 'INPUT' || tag === 'TEXTAREA') return;

    if(['ArrowDown','ArrowRight','PageDown',' '].indexOf(e.key) > -1){
      e.preventDefault();
      next();
    } else if(['ArrowUp','ArrowLeft','PageUp'].indexOf(e.key) > -1){
      e.preventDefault();
      prev();
    }
  }, { passive:false });

  // Touch navigation (mobile swipe)
  var touchStartY = null;
  window.addEventListener('touchstart', function(e){
    touchStartY = e.touches[0].clientY;
  }, { passive:true });
  window.addEventListener('touchend', function(e){
    if(touchStartY === null) return;
    var dy = touchStartY - e.changedTouches[0].clientY;
    touchStartY = null;
    if(Math.abs(dy) < 50) return;
    if(dy > 0) next(); else prev();
  }, { passive:true });

  // Nav clicks
  navLinks.forEach(function(link){
    link.addEventListener('click', function(e){
      e.preventDefault();
      var idx = sections.indexOf(link.dataset.target);
      if(idx > -1) goTo(idx);
    });
  });

  // Init from hash if present
  var hash = window.location.hash.replace('#','');
  var initIdx = sections.indexOf(hash);
  if(initIdx > -1) current = initIdx;
  initPlacement();

  // Hero typewriter (single orchestrated entrance moment)
  var heroName = document.getElementById('heroName');
  var fullText = 'Marcus Mário';
  var i = 0;
  function typeNext(){
    if(i <= fullText.length){
      heroName.innerHTML = fullText.slice(0, i) + '<span class="type-cursor">&nbsp;</span>';
      i++;
      setTimeout(typeNext, 68);
    } else {
      heroName.innerHTML = fullText + '<span class="type-cursor">&nbsp;</span>';
    }
  }
  typeNext();

  // Contato — envia via Formspree (AJAX), sem navegar para fora da página.
  // Configure o endpoint em action="https://formspree.io/f/SEU_ID_AQUI" (ver instruções abaixo do código).
  var form = document.getElementById('contactForm');
  var status = document.getElementById('formStatus');
  var submitBtn = document.getElementById('formSubmitBtn');

  form.addEventListener('submit', function(e){
    e.preventDefault();

    var endpoint = form.getAttribute('action') || '';
    if(!endpoint || endpoint.indexOf('SEU_ID_AQUI') > -1){
      status.textContent = 'formulário ainda não configurado — defina o endpoint do Formspree.';
      status.classList.add('show');
      return;
    }

    var originalLabel = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'enviando...';
    status.textContent = '';
    status.classList.remove('show');

    fetch(endpoint, {
      method: 'POST',
      body: new FormData(form),
      headers: { 'Accept': 'application/json' }
    }).then(function(response){
      if(response.ok){
        status.textContent = 'mensagem enviada com sucesso — obrigado pelo contato!';
        form.reset();
      } else {
        status.textContent = 'não foi possível enviar agora — tente novamente em instantes.';
      }
      status.classList.add('show');
    }).catch(function(){
      status.textContent = 'falha de conexão — verifique sua internet e tente novamente.';
      status.classList.add('show');
    }).finally(function(){
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
      setTimeout(function(){ status.classList.remove('show'); }, 5000);
    });
  });
})();
