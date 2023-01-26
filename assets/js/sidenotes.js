/**
 * @author: Kaushik Gopal
 *
 * A jQuery function that displays the footnotes
 * on the side (sidenotes) for easier reading.
 *
 * This is as recommended by Edward Tufte's style sidenotes:
 * https://edwardtufte.github.io/tufte-css/#sidenotes
 *
 * TODO:
 *      - if two subsequent lines have long sidenotes
 *        need to take care of the overlap properly and offset
 **/
(function () {
    const $footnotes = $(".footnotes"),
        sideNoteStartMargin = 12,
        sideNoteMaxWidth = 280,
        sideNoteMinWidth = 140;

    $(window).on("load", function () {


        // don't run this script if there aren't any footnotes
        if ($footnotes.length < 1) {
            return;
        }

        loadSideNotesFromFootnotes();

        $(window).resize(function () {
            // console.log(" XXX -- RESIZE -- XXX ");

            // TODO: optimization if window width doesn't change that much
            // const new_ww = $(".wrapper").outerWidth();
            // if (new_ww === windowWidth) return;
            // windowWidth = new_ww;

            loadSideNotesFromFootnotes();
        });
    });

    function loadSideNotesFromFootnotes() {

        const $postTitle = $(".post-title"),
            browserWidth = $(".post").width(),
            startPosition = $postTitle.position().left + $postTitle.outerWidth() + sideNoteStartMargin;

        $(".sidenote").remove(); // remove any existing side notes to begin
        $footnotes.show();  // previous resize could have hidden footnotes

        //#region Should we even show sidenotes?

        //#region there's no post-content
        if ($postTitle.length < 1) {
            return;
        }
        //#endregion

        //#region there's no space for sidenotes
        const availabeSpaceForSideNote = browserWidth - startPosition;

        // console.log(" ---> availabeSpaceForSideNote " + availabeSpaceForSideNote);
        // console.log(" ---> sideNoteWidth [" + sideNoteMinWidth + " - " + sideNoteMaxWidth + "]");

        if (availabeSpaceForSideNote < sideNoteMinWidth) {
            return;
        }
        //#endregion

        //#endregion

        const $fnItems = $footnotes.find("ol li");

        $("sup").each(function (index) {
            const $footnoteHtml = $fnItems.eq(index).html();
            createSideNote($(this), $footnoteHtml, startPosition);
        });

        $footnotes.hide();
    }

    function createSideNote(superscript, footnoteHtml, startPosition) {

        // console.log(" ---> " + superscript.text() + " : " + footnoteHtml);

        // construct side note <div>
        let div = $(document.createElement('div'))
            .html(footnoteHtml)
            .addClass("sidenote");

        const topPosition = superscript.offset();

        div.css({
            position: "absolute",
            left: startPosition,
            top: topPosition["top"],
            minWidth: sideNoteMinWidth,
            maxWidth: sideNoteMaxWidth,
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
