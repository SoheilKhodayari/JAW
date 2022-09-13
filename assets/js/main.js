function initAnimations() {
    var $animated = jQuery('.animated');

    $animated.appear({
        force_process: true
    });

    $animated.on('appear', function() {

        var $el = jQuery(this);

        var animation = $el.data('animation');
        var delay = $el.data('delay');

        if (delay) {

            setTimeout(function() {
                $el.addClass(animation);
                $el.addClass('showing');
                $el.removeClass('hiding');
            }, delay);
        } else {

            $el.addClass(animation);
            $el.addClass('showing');
            $el.removeClass('hiding');
        }
    });

    // Service hover animation
    jQuery('.service').hover(function() {
        jQuery('i', this).addClass('animated tada');
    }, function() {
        jQuery('i', this).removeClass('animated tada');
    });
}

jQuery(document).ready(function() {

    // initNavbar();
    // initPortfolio();
    initAnimations();
});

// $(window).load(function() {
//     var $loader = $('.loader');
//     $loader.find('.fading-line').fadeOut();
//     $loader.fadeOut("slow");
// });


function copyToClipboard(elem, copied_banner) {
    var range = document.createRange();
    range.selectNode(elem);
    window.getSelection().removeAllRanges(); // clear current selection
    window.getSelection().addRange(range); // to select text
    document.execCommand("copy");
    window.getSelection().removeAllRanges();// to deselect

  $(copied_banner).show().animate({ top: -25, opacity: 0 }, 700, function() {
    $(this).css({ top: 0, opacity: 1 }).hide();
  });

}


$("#publications-container").on("click", ".copy-btn", function(e) {
    let input = e.target.closest('div').firstChild.nextSibling;
    let copied_banner = e.target.closest('span').nextSibling.nextSibling;
    copyToClipboard(input, copied_banner);
});