/**
 * @author: Kaushik Gopal
 *
 * Script that take care of showing the goto button functionality
 *
 **/

/**
 * Helper jquery function to detect scrolling
 */
(function () {
  var lastScrollAt = Date.now(),
    timeout;

  function scrollStartStop() {
    var $this = $(this);

    if (Date.now() - lastScrollAt > 100) $this.trigger("scrollstart");

    lastScrollAt = Date.now();

    clearTimeout(timeout);

    timeout = setTimeout(function () {
      if (Date.now() - lastScrollAt > 99) $this.trigger("scrollend");
    }, 100);
  }

  $(document).on("scroll", scrollStartStop);
})();

/**
 * calls the function func once within the within time window.
 * this is a debounce function which actually calls the func as
 * opposed to returning a function that would call func.
 *
 * @param func    the function to call
 * @param within  the time window in milliseconds, defaults to 300
 * @param timerId an optional key, defaults to func
 */
function callOnce(func, within = 300, timerId = null) {
  window.callOnceTimers = window.callOnceTimers || {};
  if (timerId == null) timerId = func;
  var timer = window.callOnceTimers[timerId];
  clearTimeout(timer);
  timer = setTimeout(() => func(), within);
  window.callOnceTimers[timerId] = timer;
}

(function () {

  function showBtn($btn) {
    $btn.css({
      opacity: "0.75",
      filter: "alpha(opacity=75)",
      "-moz-opacity": "0.75",
    });
  }

  function hideBtn($btn) {
    $btn.css({
      opacity: "0",
      filter: "alpha(opacity=0)",
      "-moz-opacity": "0",
    });
  }

  const
    $gotoBottomBtn = $(".goto.bottom"),
    $gotoTopBtn = $(".goto.top");

  // first show the buttons through CSS
  // opacity also will need to be set
  $gotoBottomBtn.add($gotoTopBtn).css({ display: "block" });

  $(document).on("scrollstart", function () {
    showBtn($gotoBottomBtn);
    showBtn($gotoTopBtn);
  });

  $(document).on("scrollend", function () {
    callOnce(function () {
        hideBtn($gotoBottomBtn);
        hideBtn($gotoTopBtn);
    });
  });
})();
