/**
 * @author: Kaushik Gopal
 *
 * Script that take care of showing the goto button functionality
 *
 **/

(function () {
  $(window).on("load", function () {
    const $gotoBottomBtn = $(".goto.bottom"),
      $gotoTopBtn = $(".goto.top"),
      SCROLLED_TOP_BY = 50,
      SCROLLED_TO_BOTTOM_SECTION =
        $(document).height() - ($(this).height() + $("#site-footer").height());

    // console.log(" ---> goto loading [SCROLLED_TO_BOTTOM_SECTION: " + SCROLLED_TO_BOTTOM_SECTION + "]");

    // first show the buttons through CSS
    // opacity also will need to be set
    $gotoBottomBtn.add($gotoTopBtn).css({ display: "block" });

    let scrollPosition = 0;

    $(this).scroll(function () {
      scrollPosition = $(this).scrollTop();
      // console.log(" ---> now at "+ scrollPosition);
      showOrHideGotoBtns(scrollPosition);
    });

    function showOrHideGotoBtns(scrollPosition) {
      if (
        scrollPosition > SCROLLED_TOP_BY &&
        scrollPosition < SCROLLED_TO_BOTTOM_SECTION
      ) {
        showBtn($gotoBottomBtn);
      } else {
        hideBtn($gotoBottomBtn);
      }

      if (scrollPosition >= SCROLLED_TO_BOTTOM_SECTION) {
        showBtn($gotoTopBtn);
      } else {
        hideBtn($gotoTopBtn);
      }
    }

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
  });
})();
