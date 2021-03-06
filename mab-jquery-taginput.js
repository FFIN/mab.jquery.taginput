/*!
 * jQuery lightweight plugin boilerplate
 * Original author: @ajpiano
 * Further changes, comments: @addyosmani
 * Licensed under the MIT license
 */

;(function ( $, window, document, undefined ) {

    // Create the defaults once
    var pluginName = 'tagInput',
        defaults = {
            tagDataSeparator: '|',
            allowDuplicates: false,
            typeahead: false,
            typeaheadOptions: null,
            typeaheadDatasetOptions: null,
            callback: function(){}
        },
        // Lookup variables to make keycode handling more readable
        KEYCODES = {
            ENTER: 13,
            TAB: 9,
            BACKSPACE: 8
        };

    // The actual plugin constructor
    function Plugin(element, options) {
        this.element = element;
        
        this.options = $.extend({}, defaults, options) ;

        this._defaults = defaults;
        this._name = pluginName;

        this.init();
    }

    // Remove all entries from an array with a specific value
    var _cleanArray = function(arr, deleteValue) {
        // If no value has been specified, remove all empty strings
        if(typeof deleteValue === 'undefined')
            deleteValue = '';

        for (var i = 0; i < arr.length; i++) {
            if (arr[i] == deleteValue) {         
                arr.splice(i, 1);
                i--;
            }
        }

        return arr;
    };

    // Function to create the HTML representing the tag input control
    var _createTagInput = function(input, tagDataSeparator) {
        var tags = _cleanArray(input.val().split(tagDataSeparator));
        var tagLabels = $.map(tags, function(tag, index) {
            return '<span class="label label-primary" data-tag="' + tag + '">' + tag + ' <span class="glyphicon glyphicon-remove"></span></span>';
        }).join('');

        return $('<div class="mab-jquery-taginput' + ((input.attr('class')) ? ' ' + input.attr('class') : '') + '">' + 
                 tagLabels + 
                 '<input class="mab-jquery-taginput-data" type="hidden" name="' + input.attr('name') + '" id="' + input.attr('name') + '" value="' + input.val() + '">' +
                 '<input class="mab-jquery-taginput-input" type="text"' + (input.is('[placeholder]') ? ' placeholder="' + input.attr('placeholder') : '') + '">' + 
                 '</div>');
    };

    // Shortcut function to clear text from the tag input and close the typeahead
    var _resetTagInput = function(input, usingTypeahead) {
        if(usingTypeahead) {
            input.typeahead('val', '');
            input.typeahead('close');
        } else {
            input.val('');
        }
    };

    var _addTagToDataField = function(tagDataField, separator, tag) {
        // Concatenate the existing tag data string with the new tag
        // if the field value wasn't an empty string
        if($.trim(tagDataField.val()) === '')
            tagDataField.val(tag);
        else
            tagDataField.val(tagDataField.val() + separator + tag);
    };

    var _removeTagFromDataField = function(tagDataField, separator, tag) {
        // Slightly weird code, but basically we tack a pipe char onto the end
        // of the current tag data string (so that our replace works even if the tag is
        // the last in the string), remove the tag and return the new string minus 
        // the final character (which will always be a pipe character)
        tagDataField.val((tagDataField.val() + separator).replace(tag + separator, '').slice(0, -1));
    };

    var _removeLastTagFromDataField = function(tagDataField, separator) {
        // Split the data into an array, remove the last element and join it
        // back together again with pipe characters
        tagDataField.val(tagDataField.val().split(separator).slice(0, -1).join(separator));
    };

    Plugin.prototype = {

        init: function() {
            // Boolean to determine whether typeahead.js integration is enabled
            var usingTypeahead = this.options.typeahead;
            // boolean to determine whether the same tag can be added to the input more than once
            var allowDuplicates = this.options.allowDuplicates;
            // Character to use as a separator for the tag data (default is pipe '|')
            var separator = this.options.tagDataSeparator;

            // Replace the original input with the tag input HTML
            var originalInput = $(this.element);
            var tagInputContainer = _createTagInput(originalInput, separator);
            originalInput.replaceWith(tagInputContainer);

            // The text input element within the tag control
            var tagInput = tagInputContainer.find('.mab-jquery-taginput-input');
            // The hidden input which is used to store selected tag data
            var tagData = tagInputContainer.find('.mab-jquery-taginput-data');
            // Keep hold of the original placeholder text
            var originalPlaceHolder = tagInput.attr('placeholder');

            // Set up the typeahead if specified
            if(usingTypeahead)
                tagInput.typeahead(this.options.typeaheadOptions, this.options.typeaheadDatasetOptions);
                
            // Handle keypress in the tag text input
            tagInput.on('keypress', function(e) {
                // If someone tries to type the character we're using as a data separator, 
                // don't let them! This avoids tags being unexpectedly split when they are saved.
                if(e.keyCode == separator.charCodeAt(0))
                    return false;
            });

            //for callback
            var that = this;

            // Handle keydown events on the tag text input
            tagInput.on('keydown', function(e) {
                // Cache the reference to the input
                var input = $(this);
                // If enter is hit, and the input is *not* empty (if the input *is* empty, 
                // we don't want to prevent the default action, which is submitting the form)
                if(e.keyCode == KEYCODES.ENTER && $.trim(input.val()) !== '') {
                    // Stop the form being submitted and prevent event bubbling
                    e.preventDefault();
                    e.stopPropagation();
                    var newTag = input.val();
                    // Get the index of the tag in the tag data (-1 if not already present)
                    var tagIndex = $.inArray(newTag, tagData.val().split(separator));
                    // Don't allow the addition of duplicate tags unless explicitly specified
                    if(allowDuplicates || (tagIndex === -1)) {
                        // Insert a new tag span before the hidden input
                        tagData.before('<span class="label label-primary" data-tag="' + newTag + '">' + newTag + ' <span class="glyphicon glyphicon-remove"></span></span>');
                        _addTagToDataField(tagData, separator, newTag);
                        // Reset the tag input
                        _resetTagInput(input, usingTypeahead);
                        input.attr('placeholder', '');
                        that.options.callback.call(newTag,tagData.val());
                    } else {
                        // Highlight the duplicate tag
                        var existing = tagInputContainer.find('span.label[data-tag="' + newTag + '"]');
                        existing.removeClass('label-primary').addClass('label-danger');
                        setTimeout(function() {
                            existing.removeClass('label-danger').addClass('label-primary');
                        }, 1500);
                    }
                }
                // If backspace is hit and there's nothing in the input (if the input *isn't* empty, 
                // we don't want to prevent the default action, which is deleting a character)
                if(e.keyCode == KEYCODES.BACKSPACE && $.trim(input.val()) === '') {
                    // Remove the last tag span before the hidden data input
                    var tagRemoved = tagData.prev('span.label').text();
                    tagData.prev('span.label').remove();

                    _removeLastTagFromDataField(tagData, separator);
                    // Reset the tag input
                    _resetTagInput(input, usingTypeahead);
                    if(tagData.val() === '')
                        input.attr('placeholder', originalPlaceHolder);
                    that.options.callback.call(tagRemoved,tagData.val());
                }
            });

            // Handle focus and blur on the text input
            tagInputContainer.on('focus', 'input[type=text]', function(e) {
                // Remove the narrowing class, restoring input to its original width
                tagInputContainer.find('input[type=text]').removeClass('h');
            }).on('blur', 'input[type=text]', function(e) {
                // When the tag text input loses focus, add a class which narrows it
                // to 1px wide (this is to avoid odd visual effects when the tags in 
                // the control wraps onto multiple lines)
                if(tagData.val() !== '')
                    tagInputContainer.find('input[type=text]').addClass('h');
                // Reset the tag input
                _resetTagInput(tagInput, usingTypeahead);
            });

            // Focus the text input when the control container is clicked, which triggers
            // the show/hide behaviours defined in the handlers above
            tagInputContainer.on('click', function(e) {
                if(usingTypeahead)
                    tagInputContainer.find('input[type=text].tt-input').focus();
                else
                    tagInputContainer.find('input[type=text]').focus();
            });

            // Handle tag delete icon click
            tagInputContainer.on('click', 'span.glyphicon', function(e) {
                // Don't bubble the click event up to the input container
                // This would cause the text input to be shown by the container's click event
                e.stopPropagation();
                // Get the text of the tag to be removed (parent of this is the label span)
                var tag = $(this).parent();
                var tagText = $.trim(tag.text());
                _removeTagFromDataField(tagData, separator, tagText);
                tag.remove();
                that.options.callback.call(tagText,tagData.val());
            });

            // If the control already has some tags in it
            if(tagData.val() !== '') {
                // Remove the placeholder text
                tagInput.attr('placeholder', '');
                // Initially blur the text input so it's hidden on load
                tagInputContainer.find('input[type=text]').blur();
            }
        }
    };

    // A really lightweight plugin wrapper around the constructor,
    // preventing against multiple instantiations
    $.fn[pluginName] = function (options) {
        return this.each(function() {
            if (!$.data(this, "plugin_" + pluginName)) {
                $.data(this, "plugin_" + pluginName,
                new Plugin(this, options));
            }
        });
    };

})(jQuery, window, document);