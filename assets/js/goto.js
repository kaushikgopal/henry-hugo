/**
 * @author: Kaushik Gopal
 *
 * Script that take care of showing the goto button functionality
 *
 **/

(function () {
    $(window).on("load", function () {

        const   $gotoBottomBtn = $('.goto-bottom'),
                SCROLLED_TOP_BY = 200,
                SCROLLED_TO_BOTTOM_SECTION  = $(document).height() - ($(this).height() + $('#site-footer').height())
              ;

        // console.log(" ---> goto loading [SCROLLED_TO_BOTTOM_SECTION: " + SCROLLED_TO_BOTTOM_SECTION + "]");

        // first show the button through CSS
        // opacity also will need to be set
        $gotoBottomBtn.css({ display: "block" });


        let scrollPosition = 0;

        $(this).scroll(function() {
            scrollPosition = $(this).scrollTop();
            // console.log(" ---> now at "+ scrollPosition);
            showOrHideGotoBtns(scrollPosition)
        });


        function showOrHideGotoBtns(scrollPosition) {
            if(scrollPosition > SCROLLED_TOP_BY && scrollPosition < SCROLLED_TO_BOTTOM_SECTION) {
                showGotoBottomBtn();
            } else {
                hideGotoBottomBtn();
            }
        }

        function showGotoBottomBtn() {
            $gotoBottomBtn.css({
                opacity: "0.75",
                'filter':'alpha(opacity=75)',
                '-moz-opacity': "0.75"
            });
        }

        function hideGotoBottomBtn() {
            $gotoBottomBtn.css({
                opacity: "0",
                'filter':'alpha(opacity=0)',
                '-moz-opacity': "0"
            });
        }

    });

})();
