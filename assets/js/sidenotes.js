/**
 * @author: Kaushik Gopal
 *
 * A jQuery function that displays the footnotes
 * on the side (sidenotes) for easier reading.
 *
 * This is as recommended by Edward Tufte's style sidenotes:
 * https://edwardtufte.github.io/tufte-css/#sidenotes
 *
 **/
(function () {

    $(window).on("load", function () {
        const $footnotes = $(".footnotes");

        // don't run this script if there aren't any footnotes
        if ($footnotes.length < 1) {
            return;
        }

        loadSideNotesFromFootnotes($footnotes);

        $(window).resize(function () {
            // console.log(" XXX -- RESIZE -- XXX ");

            // TODO: optimization if window width doesn't change that much
            // const new_ww = $(".wrapper").outerWidth();
            // if (new_ww === windowWidth) return;
            // windowWidth = new_ww;

            loadSideNotesFromFootnotes($footnotes);
        });
    });

    function loadSideNotesFromFootnotes($footnotes) {

        const sideNoteStartMargin = 6,
            sideNoteWidth = 228,
            browserWidth = $("window").width(),
            postTitle = $(".post-title"),
            startPosition = postTitle.position().left + postTitle.outerWidth() + sideNoteStartMargin;

        $(".sidenote").remove(); // remove any existing side notes to begin
        $footnotes.show();  // previous resize could have hidden footnotes

        //#region Should we even show sidenotes?

        //#region there's no post-content
        if (postTitle.length < 1) {
            return;
        }
        //#endregion

        //#region there's no space for sidenotes
        const availabeSpaceForSideNote = browserWidth - startPosition;

        // console.log(" ---> availabeSpaceForSideNote " + availabeSpaceForSideNote);
        // console.log(" ---> sideNoteWidth " + sideNoteWidth);

        if (availabeSpaceForSideNote < sideNoteWidth) {
            return;
        }
        //#endregion

        //#endregion

        const $fnItems = $footnotes.find("ol li");

        $("sup").each(function (index) {
            const $footnoteText = $fnItems.eq(index).text().trim();
            createSideNote($(this), $footnoteText, startPosition, sideNoteWidth);
        });

        $footnotes.hide();
    }

    function createSideNote(superscript, footnoteText, startPosition, sideNoteWidth) {

        // console.log(" ---> " + superscript.text() + " : " + footnoteText);

        // construct side note <div>
        let div = $(document.createElement('div'))
            .text(footnoteText)
            .addClass("sidenote");

        const topPosition = superscript.offset();

        div.css({
            position: "absolute",
            left: startPosition,
            top: topPosition["top"],
            width: sideNoteWidth,
        });

        if (startPosition > 420) {
            superscript.hover(function () {
                div.addClass("sidenote-hover");
            }, function () {
                div.removeClass("sidenote-hover");
            });
        } else {
            div.addClass("sidenote-hover");
        }

        // console.log(" ---> ");

        // attach side note <div>
        $(document.body).append(div);
    }

})();
