$(function() {
/*!
 * jQuery - .scrollTo()
 *
 *  Author:
 *  Timothy A. Perez
 *
 * Date: OCT 2012
 * Comments: Setting new web standards...
 */
    // .scrollTo - Plugin
    $.fn.scrollTo = function( target, options, callback ){
      if(typeof options == 'function' && arguments.length == 2){ callback = options; options = target; }
      var settings = $.extend({
        scrollTarget  : target,
        offsetTop     : 50,
        duration      : 500,
        easing        : 'swing'
      }, options);
      return this.each(function(){
        var scrollPane = $(this);
        var scrollTarget = (typeof settings.scrollTarget == "number") ? settings.scrollTarget : $(settings.scrollTarget);
        var scrollY = (typeof scrollTarget == "number") ? scrollTarget : scrollTarget.offset().top + scrollPane.scrollTop() - parseInt(settings.offsetTop);
        scrollPane.animate({scrollTop : scrollY }, parseInt(settings.duration), settings.easing, function(){
          if (typeof callback == 'function') { callback.call(this); }
        });
      });
    }
    
    // [start] Demo Code //
    var $chapters = $('#demo-stage').find('ul').children('li');
    var $chScrollPositions = new Array();
    
    // Cache Scroll Positions for Each Chapter
    $chapters.each(function(i){
        $chScrollPositions[i] = Math.round($(this).offset().top - $('#demo-stage').offset().top) - 10;
    });
    $chapters.eq(0).addClass('active'); // Set First Chapter Active on Start
    
    $('#demo-nav > nav > button').click(function(){
        var last = $chapters.parent().find('li.active').removeClass('active').index();
        var next;
        
        switch($(this).index()){
            case 1: // Action - Next Chapter
                next = (last + 1 == $chapters.length) ? 0 : last + 1; // Loop around to first chapter
            break;
            case 2: // Action - Last Chapter
                next = $chapters.length - 1;
            break;
            case 3: // Action - First Chapter
                next = 0;
            break;
        }
        $chapters.eq(next).addClass('active'); // Set Next Chapter Active
        $('#demo-stage').scrollTo($chScrollPositions[next]);
    });
    // [end] Demo Code //
});