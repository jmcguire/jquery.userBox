 /*
 * UserBox
 *
 * Copyright 2010 Justin McGuire. Licensed under the MIT License.
 * Contact: mcguire.justin@gmail.com
 *
 * Version 1.0
 *
 * Enable a drag and drop user selection system.
 * This plugin was developed to enable a nice online email interface, where you can drag users
 * from a userbox onto the desired field, To, CC, or BCC.
 *
 * Minimum versions: jQuery 1.4.0, jQuery UI 1.7.0
 * (Note: This program can be modifed for earlier jQuery versions.)
 *
 * Much code & CSS was flagrantly filched from AutoSuggest by Drew Wilson (drewwilson.com)
 * Which was itself brazenly bagged from FaceList by Ian Tearle (iantearle.com)
 */

(function($) {

$.fn.userBox = function(data, options) {

    var opts = $.extend({}, $.fn.userBox.defaults, options);
    if (!opts.dbl_click) opts.dbl_click = this.first().attr('id');

    // general dragging setup
    var draggable_setup = {
        revert: 'invalid',
        helper: function () {
            // break us out of our scrollable pane
            return $(this).clone().appendTo('body').css('zIndex',5).show();
        }
    };

    // keep track of each input in hashes
    var li_inputs     = new Object(); // the li containers of the text input
    var text_inputs   = new Object(); // the input text boxes
    var hidden_inputs = new Object(); // the hidden input element, stores the real form value

    var userbox = setup_userbox($(opts.userbox));
    var data_hash = new Object(); // hash, to easily track of all the data

    // populate the userbox with the data
    $.each( data, function (index, value) {
        // create the list item in the userbox
        var item = $('<li class="ub-item" id="ub-index-' + index + '">'
                     + value[opts.data_text_field] + '</li>');

        // a double-click will automatically move it to the first input
        item.dblclick( function(){
            item.slideUp('fast');
            add_item_to_field('ub-index-' + index, opts.dbl_click);
        });

        userbox.append(item);

        data_hash['ub-index-' + index] = {
            id: value[opts.data_id_field],
            display_text: value[opts.data_text_field],
            item: item
        };

    });

    $('.ub-item').draggable(draggable_setup);

    // setup each input box
    return this.each(function(){

        // improve the input box
        var ul_box = setup_input($(this));

        // set up some global variables
        var name = $(this).attr('name') + '';
        hidden_inputs[name] = $('#ub-values-' + name);
        text_inputs[name]   = $(this);
        li_inputs[name]     = $('#ub-drop-' + name + ' .ub-original');

        // we took over the "name" attribute for the hidden input, so the user recieves the
        // data where they expect it, but now we have to give the old input a new name.
        $(this).attr('name', 'ub-placeholder-' + name);

        // to add an item to this field, just use this closure
        ul_box.data('add_item', function(index){
            add_item_to_field(index, name);
        });
        
        // dropping setup, for the all the improved input lists
        ul_box.droppable({
            accept: '.ub-item',
            hoverClass: 'active',
            tolerance: 'touch',
            drop: function(event, ui) {

                var text = ui.draggable.text().replace(/^\s*(?:&times;|\u00D7)/, '');
                var field_ident = $(this).attr('id').substr(8); // remove the "ub-drop-"

                if (ui.draggable.data('index')) { // we're coming from another input field
                    var index = ui.draggable.data('index');
                    ui.draggable.data('moving')();
                } else { // we're coming from the userbox
                    // remove the item
                    ui.draggable.slideUp('fast');
                    var index = ui.draggable.attr('id');
                }

                $(this).data('add_item')(index);
            }
        });

        // fill in this input with any specified defaults
        var id = $(this).attr('id');
        if (opts.prefill[id]) prefill( opts.prefill[id], ul_box );
    });
    
    // DONE WITH SETUP

    // add an item to the "improved input list"
    //   field_ident => the "name" of the input box we want to add this to
    //   index => index for data_hash (to retrieve the name and email)
    //            if this is a manually entered item, then this is the input text
    function add_item_to_field(index, field_ident){
        //alert("field_ident: " + field_ident + ", index: " + index);

        if (data_hash[index]) {
            var id = data_hash[index].id;
            var display_text = data_hash[index].display_text;
            var from_userbox = 1;
        } else {
            var id = index;
            var display_text = index;
            var from_userbox = 0;
        }

        // create the new item
        var item = $('<li class="ub-item"></li>').draggable(draggable_setup);
        item.data('index', index).data('in', field_ident);

        // call this if you want to remove it from the input box (and put it back in the userbox)
        item.data('removing', function(){
            item.data('moving')();
            if (from_userbox) $('#' + index).slideDown(); // put it back into the userbox
        });

        // call this if you're moving it from one input field to another
        item.data('moving', function(){
            remove_from_hidden(field_ident, id); // reset the hidden input
            slideLeft(item); // delete from this list
        });

        // remove it on a doubleclick
        item.dblclick( function(){
            item.data('removing')();
        });

        // create the close button, which removes the item
        var close = $('<a class="ub-close">&times;</a>').click(function(){
            item.data('removing')();
        });

        // add the item (with the close button) to the appropriate input list
        li_inputs[field_ident].before( item.html(display_text).prepend(close) );

        // populate the hidden input field
        add_to_hidden(field_ident, id);
    };

    //
    // SETUP FUNCTIONS
    //

    // Improve the input box. Basically we wrap it with a UL, and LI elements will be
    // appealing bubbles.
    function setup_input (input_field) {
        var name = input_field.attr('name');
        var values_input = $('<input type="hidden" class="ub-values" name="' + name
                            + '" id="ub-values-' + name + '" />');

        var ul_box = $('<ul id="ub-drop-'+name+'" class="ub-inputlist"></ul>');
        ul_box.width( input_field.width() ); // respect the original input width
        input_field.wrap(ul_box);
        input_field.wrap('<li class="ub-original"></li>');
        input_field.after(values_input);
        input_field.width( opts.new_text_width );

        ul_box = $('#ub-drop-'+name); // need to reset this, otherwise ul_box doesn't actually point
                                      // to anything

        // make all clicks anywhere in the "improved input list" go to the actual input text box
        ul_box.click(function(){
            input_focus = true;
            input_field.focus();
        }).mousedown(function(){ input_focus = false; });

        // TODO: change 188 to the opts.separator instead
        input_field.keydown(function(event) {
            switch (event.keyCode) {

                // when we think input is done, turn the input into a ub-item
                case 188: // comma
                    event.preventDefault();
                    // and fall through to ...
                case 9:   // tab
                case 13:  // return
                    var i_input = input_field.val().replace(/(,)/g, '').replace(/^\s+|\s+$/g, '');
                    if (i_input == '') break;
                    add_item_to_field(i_input, name);
                    input_field.val('');
                    break;

                // we can use the delete key to remove the last ub-item in the list
                case 8:  // delete
                    if (input_field.val() == '' && $('#ub-drop-' + name + ' > .ub-item').length) {
                        var last_item = $('#ub-drop-' + name + ' > .ub-item').last();
                        if (last_item.hasClass('ub-item-active')){
                            last_item.data('removing')();
                        } else {
                            last_item.addClass('ub-item-active');
                        }
                    }
                    break;
                
                // for any other keypress, remove the "ready to delete" class
                default:
                    var last_item = $('#ub-drop-' + name + ' > .ub-item').last();
                    last_item.removeClass('ub-item-active');
                    break;
            }
        }).blur(function(event) {
            // remove the "ready to delete" class, copied from above
            var last_item = $('#ub-drop-' + name + ' > .ub-item').last();
            last_item.removeClass('ub-item-active');

            // turn any text into a ub-item, mostly copied from above
            var i_input = input_field.val().replace(/(,)/g, '').replace(/^\s+|\s+$/g, '');
            if (i_input == '') return;
            add_item_to_field(i_input, name);
            input_field.val('');
        });
        return ul_box;
    };

    // set up the userbox inside the block we're given
    function setup_userbox (container) {
        if (opts.css_tricks) container.css('padding', '0px'); // this will mess us up

        var offset = 0; // used to calculate the height of the <ul> userbox

        if (opts.title) {
            var title_box = $('<div class="ub-title">' + opts.title + '</div>');
            container.append(title_box);
            offset += title_box.outerHeight();
        }

        var userbox = $('<ul id="ub-box"></ul>');
        container.append(userbox);

        offset += parseInt(userbox.css('padding-top').replace('px', ''))
                + parseInt(userbox.css('padding-bottom').replace('px', '')) ;

        // make the userbox fit perfectly in our supplied box, respecting its height
        if (opts.css_tricks) userbox.height( container.innerHeight() - offset );

        return userbox;
    };

    // a wrapper for prefill_item, this just decides whether we have a 
    function prefill(prefill_data, input_box) {
    
        // find and place one item
        var prefill_item = function (id) {
            var found = 0;
            $.each(data_hash, function(index, value){
                if (value.id != id) return;
                found = 1;
                value.item.slideUp('fast');
                input_box.data('add_item')(index);
            });
            if (!found) {
                input_box.data('add_item')(id);
            }
        }

        // just check whether we have one item or an array of them
        if (typeof prefill_data == 'string') {
            prefill_item(prefill_data)
        } else {
            $.each(prefill_data, function(index, value){
                prefill_item(value)
            });
        }
    }

    //
    // UTILITY FUNCTIONS
    //

    // remove an item by sliding it out, stage left
    function slideLeft (element) {
        element.hide('slide', {}, 'fast', function(){ $(this).remove() });
    };

    function add_to_hidden (field_ident, id) {
        hidden_inputs[field_ident].val(
            hidden_inputs[field_ident].val() + id + opts.separator
        );
    };

    function remove_from_hidden (field_ident, id) {
        hidden_inputs[field_ident].val(
            hidden_inputs[field_ident].val().replace(id + opts.separator, '')
        );
    };

};

// config defaults
$.fn.userBox.defaults = {
    userbox: '',        // the #id of the element that will hold the user list
    separator: ',',     // separatorm, placed between elements in the input
    data_id_field: 'id',     // fieldname that is passed with the form submit
    data_text_field: 'text', // fieldname that is displayed to the user
    title: false,       // title of userbox
                        // you can style it with .ub-title
    dbl_click: '',      // #id of default input field for on a double-click
    css_tricks: true,   // enable css tricks with padding, height, and width

    prefill: [],        // move or create items to selected fields
    new_text_width: 150 // the text field is remade to this width
};

})(jQuery);

