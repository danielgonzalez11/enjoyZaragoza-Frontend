/*globals accounting */
/*exported project, invest_calc, investor_form, payment_step2, payment_step3, user_settings */

$(document).on('show.bs.tab shown.bs.tab', 'a[data-toggle="tab"]', function(e) {
  var target = $($(e.target).attr('href'));
  if (target.length && target.attr('data-url') && !target.data('tab-loaded')) {
    target.load(target.attr('data-url'));
    target.data('tab-loaded', true);
  }
});

$(document).on('show.bs.modal', '.modal-ajax', function(e) {
  var modal = $(this);
  var btn = $(e.relatedTarget);
  var url = btn.data('url');
  var title = btn.data('title');
  var loader = modal.find('.modal-loading').show();
  var error = modal.find('.modal-error').hide();
  var body = modal.find('.modal-body').hide().load(url, function(r, status) {
    loader.fadeOut('slow');
    if (status === 'error') {
      error.fadeIn('slow');
    } else {
      body.fadeIn('slow');
    }
  });
  if (title) {
    modal.find('.modal-title').text(title);
  }
});

if ($.validator) {
  $.validator.addMethod('idNumber', function(value) {
    value = value.toUpperCase();

    if (value.length===0) {
        return true;
    }
    
    var type = $(this.currentForm).find('[name="document_type"]').val().toUpperCase();
    $.validator.messages.idNumber = 'Por favor, introduce un '+type+' válido.';

    // Basic format test
    if ( !value.match("((^[A-Z]{1}[0-9]{7}[A-Z0-9]{1}$|^[T]{1}[A-Z0-9]{8}$)|^[0-9]{8}[A-Z]{1}$)") ) {
        return false;
    }
    
    if (type === 'NIE') {
      // Test NIE
      //T
      if (/^[T]{1}/.test(value)) {
          return (value[8] === /^[T]{1}[A-Z0-9]{8}$/.test(value));
      }
      //XYZ
      if (/^[XYZ]{1}/.test(value)) {
          return (
            value[8] === "TRWAGMYFPDXBNJZSQVHLCKE".charAt(
             value.replace('X', '0')
              .replace('Y', '1')
              .replace('Z', '2')
              .substring(0, 8) % 23
            )
         );
      }
    } else {
      // Test NIF
      if ( /^[0-9]{8}[A-Z]{1}$/.test( value ) ) {
              return ( "TRWAGMYFPDXBNJZSQVHLCKE".charAt( value.substring( 8, 0 ) % 23 ) === value.charAt( 8 ) );
      }
      // Test specials NIF (starts with K, L or M)
      if ( /^[KLM]{1}/.test( value ) ) {
              return ( value[ 8 ] === String.fromCharCode( 64 ) );
      }
    }
    
    return false;
  });

  $.validator.addMethod('cif', function(value) {
    value = value.replace(/[\s-]/g, ""); // quitar espacios o guiones
    var par = 0;
    var non = 0;
    var letras = "ABCDEFGHKLMNPQS";
    var letra = value.charAt(0);
    var zz;
    var nn;
    var parcial;
    var control;
    if (value.length===0) {
            return true;
    }
    if (value.length!==9) {
            //alert('El Cif debe tener 9 dígitos');
            return false;
    }
    if (letras.indexOf(letra.toUpperCase())===-1) {
            //alert("El comienzo del Cif no es válido");
            return false;
    }
    for (zz=2;zz<8;zz+=2) {
            par = par+parseInt(value.charAt(zz));
    }
    for (zz=1;zz<9;zz+=2) {
            nn = 2*parseInt(value.charAt(zz));
            if (nn > 9) {
                nn = 1+(nn-10);
            }
            non = non+nn;
    }
    parcial = par + non;
    control = (10 - ( parcial % 10));
    if (control===10){
            control=0;
    }
    if (control!==parseInt(value.charAt(8))) {
            //alert("El Cif no es válido");
            return false;
    }
    //alert("El Cif es válido");
    return true;
    
  }, "Por favor, introduce un CIF válido.");
}

function cleanError(input) {
  var c = input;
  setTimeout(function(){
    var v = $(c.form).validate();
    if ( v.settings.unhighlight ) {
      v.settings.unhighlight.call(v, c, v.settings.errorClass, v.settings.validClass);
    }
    v.hideThese(v.errorsFor(c));
  }, 300);
}

function scrollTo(obj, opt) {
  var cur = $(window).scrollTop();
  var pos = obj.offset().top;
  
  opt = opt || {};
  var between = opt.between || {};
  var to = between.top || cur < pos? cur : pos;
  var bottom = between.bottom || obj.offset().top + obj.height() - $(window).height();
  
  if (to < cur) {
    to = cur;
  }
  if (to < bottom) {
    to = bottom;
  }
  if (to > pos) {
    to = pos;
  }
  to = parseInt(to);
  
  delete opt.between;
  
  if (to !== cur) {
      $('html, body').animate({
          scrollTop: to
      }, opt);
  } else {
    if (opt.complete) {
      opt.complete.call(obj[0]);
    }
  }
}

function project() {
    $(function() {
        var template = $('#reply-form');
        var templateHeight = template.height();
        $(document).on('click', '.btn-reply', function() {
            var btn = $(this);
            var id = btn.data('id');
            var wrap = $('#reply-'+id);
            if (!wrap.length) {
                wrap = $('<div id="reply-'+id+'" class="col-md-offset-1 col-md-11"></div>').hide();
                template.clone().removeAttr('id').appendTo(wrap);
                wrap.find('input[name="reply-to"]').val(id);
                wrap.find('textarea').val();
                wrap.insertAfter($(this).closest('.comment-wrap'));
                wrap.slideDown('slow');
                btn.attr('href', '#reply-'+id);
            }
            var form = wrap.find('form');
            setTimeout(function() {
                scrollTo(form, {
                  between: {
                    top: btn.closest('.comment-wrap').offset().top,
                    bottom: form.offset().top + templateHeight - $(window).height()
                  },
                  complete: function() { form.find('textarea').focus(); },
                  duration: 'slow'
                });
            }, 1);

            return false;
        });
    });
}


function invest_calc(project_id, project_slug, max, min, newShareValue, goal, pledged, percentage, returnEstimate) {
    $(function() {
        accounting.settings.currency.format = "%v %s";
        accounting.settings.currency.symbol = window.currencySymbol;
        accounting.settings.currency.precision = 0;
        accounting.settings.number.precision = 0;
        if (window.locale === 'es_ES') {
            accounting.settings.number.decimal = ",";
            accounting.settings.number.thousand = ".";
        } else {
            accounting.settings.number.decimal = ".";
            accounting.settings.number.thousand = ",";
        }

        $('#amount').numeric({
            allowPlus           : false, // Allow the + sign
            allowMinus          : false,  // Allow the - sign
            allowThouSep        : false,  // Allow the thousands separator, default is the comma eg 12,000
            allowDecSep         : false,  // Allow the decimal separator, default is the fullstop eg 3.141
            allowLeadingSpaces  : false,
            maxDigits           : 7,   // The max number of digits
            maxDecimalPlaces    : 0,   // The max number of decimal places
            maxPreDecimalPlaces : 0,   // The max number digits before the decimal point
            max                 : max,   // The max numeric value allowed
            min                 : min,    // The min numeric value allowed

        }).on('keyup change blur', function() {

            var str = $(this).val();
        /*    if (window.locale === 'es_ES') {
                str = str.replace('.', '');
            } else {
                str = str.replace(',', '');
            } */
            if (str.length === 0) {
                str = 0;
            }
            var input = parseInt(str);

            var share = parseInt(Math.round(input / newShareValue));
            $('.calcShare').html(share);

            var invest = share * newShareValue;
            $('.calcInput').html(accounting.formatNumber(invest, 2)+' '+window.currencySymbol);

            var percent = parseFloat((invest * percentage)) / parseInt(goal);
            $('.calcPercent').html(parseFloat(percent).toFixed(2)+'%');

            var estimate = parseInt(invest * returnEstimate) / 100;
            $('.calcEstimate').html(accounting.formatNumber(estimate, 2)+' '+window.currencySymbol); // 4.999,99);

            var urlPreview = "/investment/"+project_slug+"/invest/preview/"+project_id+"/";

            var d = "disabled";
            if (invest > 1 && input >= min) {
                $('#realAmount').val(invest);
                $('.btn-contract').attr("href", urlPreview + "?amount=" + invest);
                $('.btn-contract, .btn-invest').removeClass(d).removeAttr(d);
            } else {
                $('#realAmount').val('');
                $(".btn-contract, .btn-invest").addClass(d).attr(d, d);
            }

        }).change();
    });
}

function toggleForm(form, active) {
  var data = form.data();
  var state = ('formActive' in data)? data.formActive : true;
  if (active !== state) {
    var e = $.Event((active? 'activate' : 'deactivate')+'.app.form');
    e.oldValue = this.state;
    form.trigger(e);
    if (e.isDefaultPrevented()) {
      return;
    }

    form.data('formActive', active);
    form.css('opacity', active? '':'0.65');
    form.find('label, input, select, button')
      .css('pointer-events', active? '':'none')
      .each(function(i, elem) {
        elem = $(elem);
        var data = elem.data();
        if ('oldTabIndex' in data) {
          if (active) {
            elem.attr('tabindex', data.oldTabIndex===false? '': data.oldTabIndex);
          } else {
            elem.attr('tabindex', -1);
          }
        } else if (!active) {
          var index = elem.attr('tabindex');
          elem.data('oldTabIndex', index? index : false).attr('tabindex', -1);
        }
      });
  }
}

function change_investor_type(isNew) {
  var v = $('#enterprise, #individual').filter(':checked').val();
  var e = $('#enterprise').val();
  var i = $('#individual').val();
  var emenu = $('#enterprise-menu');
  var eform = $('#enterprise-form');
  
  if (isNew) {
    $('#enterprise-menu, #enterprise-provable-menu').hide();
    $('#enterprise-others-disclaimer, #enterprise-profesional-disclaimer').hide();
    $('#type-of-investor-group, #custom-type-of-enterprise').hide();
    $('#individual-others-disclaimer').hide();
  }

  if (v===e) {
    if (isNew) {
      $('#individual-form').hide();
    }
    if (eform.length) {
      emenu.slideDown('slow').find('input:first').change();
      $('#type-of-enterprise').change();
    } else {
      emenu.find('input:checked').prop('checked', false);
    }
  } else {
    emenu.slideUp('slow');
    $('#enterprise-provable-menu').hide('slow');
    $('#enterprise-profesional-disclaimer, #enterprise-others-disclaimer').slideUp('slow');
    $('#acreditable').removeClass('submenu-triangle');
  }
  toggleForm($('#individual-form').toggle(v!==e), v===i);
  $('#enterprise-form').toggle(v===e);
  $('#individual-others-disclaimer')[v===i?'show':'hide']('slow');
}

function investor_form() {
    $(function() {
        //VALIDATION
        $('#individual-form').closest('form').validate({
            rules: {
              id_number: {
                idNumber: true
              }
            }
        });
        $('#enterprise-form').closest('form').validate({
            rules: {
              e_id_number: {
                cif: true
              }
            }
        });

        //RADIO VALUES
        var a = $('#acreditable').val();
        var p = $('#profesional').val();
        var o = $('#others').val();

        //HOOKS
        $(document)

          // SECOND LEVEL
          .on('change', '#acreditable, #profesional, #others', function() {
              var v = $('#enterprise-menu input:checked').val();
              $('#enterprise-legal-form').val(v);
              $('#enterprise-provable-menu')[v===a?'show':'hide']('slow');
              $('#enterprise-profesional-disclaimer')[v===p?'slideDown':'slideUp']('slow');
              $('#enterprise-others-disclaimer')[v===o?'slideDown':'slideUp']('slow');
              $('#acreditable')[v===a?'addClass':'removeClass']('submenu-triangle');
              $('#type-of-investor-group')[v===p?'slideDown':'slideUp']('slow').find('select').prop('disabled', v!==p);
              if (v===p||v===o) {
                toggleForm($('#enterprise-form'), true);
              } else {
                $('#enterprise-provable-menu input').first().change();
              }
          })
          .on('change', '#check-1, #check-2, #check-3', function() {
              toggleForm($('#enterprise-form'), $('#enterprise-provable-menu input:checked').length > 1);
          })
          .on('change changed.app.Control', '#type-of-enterprise', function(e) {
            if (this.value==='CUSTOM') {
              $(this).hide();
              $('#custom-type-of-enterprise').show();
              if (e.type === 'changed') {
                $(this).data('oldValue', e.oldValue);
                $('#custom-type-of-enterprise').focus();
              }
            }
          })
          .on('blur', '#custom-type-of-enterprise', function() {
            if (!this.value.trim().length) {
              var s = $('#type-of-enterprise');
              $(this).hide();
              cleanError(this);
              s.control('edit').control('value', s.data('oldValue')).control('done').show();
            }
          })

          // FIRST LEVEL AND INIT FUNCTION
          .on('change', '#enterprise, #individual', function() {
            change_investor_type();
          });
        
        change_investor_type(true);
    });
}

function payment_step2() {
    $(function() {
        $('#main-form').validate();
    });
}

function payment_step3() {
    $(function() {
        $('#main-form').validate();
    });
}

function user_settings(o) {
  $(function() {
    investor_form();
    
    $('#social-form, #avatar-form').validate();
    
    $(document)
    .on('edit.app.Control', '.form-control-inline', function () {
      var $i = $(this).removeClass('form-control-inline').addClass('form-control-editing');
      if ($i.prop('type') !== 'file') {
        var $e = $i.closest('.form-group').find('.btn-edit').hide();
        if ($e.length) {
          $e.after('<a href="#'+this.id+'" class="btn btn-link btn-cancel" tabindex="-1" data-dismiss="control">'+o.strings.cancel+'</a>');
          if ($i.prop('type') === 'textarea') {
            $e.after('<a href="#'+this.id+'" class="btn btn-link btn-save" tabindex="-1" data-save="control">'+o.strings.save+'</a>');
          }
        }
      }
    })
    
    .on('closed.app.Control', '.form-control-editing', function () {
      var $i = $(this).removeClass('form-control-editing').addClass('form-control-inline');
      $i.closest('.form-group').find('.btn-edit').toggle(!$i.hasClass('saving')).nextAll('.btn-save, .btn-cancel').remove();
    })
    
    .on('cancel.app.Control', '.form-control-editing', function () {
      cleanError(this);
    })
    
    .on('changed.app.Control', '.form-control-editing', function (e) {
      if (this.name === 'e_type' && this.value === 'CUSTOM') {
        return;
      }

      var $i = $(this);
      
      if ($i.closest('form').length && !$i.valid()) {
        e.preventDefault();
        return;
      }

      var $g = $i.closest('.radio-inline, .checkbox-inline, .form-group');
      var $e = $g.find('.btn-edit');
      var type = $i.prop('type');

      var savingfn = function() {

        $i.addClass('saving');
        if (type !== 'file') {
          $i.control('disable');
        }
      
        if ($e.length) {
          $e.hide().after('<span class="progress-spinner">'+o.strings.saving+'</span>');
          $e.nextAll('.btn-save, .btn-cancel').remove();
        } else {
          $g.addClass('progress-spinner');
        }
      };

      var enablefn = function(error) {
        if (error) {
          if (type === 'file') {
            $e.show();
          } else {
            $i.control('edit').data('app.control').oldValue = e.oldValue;
          }
          if ($i[0].form) {
            var m = {};
            m[$i[0].name] = error;
            $($i[0].form).validate().showErrors(m);
            scrollTo($g);
          } else {
            window.alert(error);
            $i.control('value', e.oldValue);
          }
        } else {
          $e.show();
        }

        if ($e.length) {
          $e.nextAll('.progress-spinner').remove();
        } else {
          $g.removeClass('progress-spinner');
        }
        
        $i.removeClass('saving');
        if (type === 'file') {
          $i.replaceWith($i.clone());
        } else {
          $i.control('enable');
        }
      };
      
      var savefn;
      if (type === 'file') {
        
        savefn = function() {
          var id = 'uploadFrame'+new Date().getTime();
          var cb = id+'Callback';

          savingfn();
          
          $('<iframe name="'+id+'" height="0" width="0" frameborder="0" scrolling="no" style="display:none"></iframe>')
            .appendTo('body')
            .on('error', function () {
              enablefn(o.strings.errorConnection);
            })
          ;

          window[cb] = function(status, data) {
            if (status === 200) {
              data = JSON.parse(data);
              if ($i[0].name === 'avatar') {
                var img = $($i[0].form).find('img');
                var neu = img.clone()
                  .on('load', function () {
                    if (this.width + this.height === 0) {
                      enablefn(o.strings.errorConnection);
                    } else {
                      img.replaceWith(neu);
                      enablefn();
                    }
                  })
                  .on('error', function () {
                    enablefn(o.strings.errorConnection);
                  })
                  .attr('src', data[$i[0].name]+'?'+new Date().getTime())
                ;
              }
            } else {
              enablefn(status===404? o.strings.error404 : data);
            }
          };

          $($i[0].form).attr('target', id).attr('action', '/Ajax/user.php/'+$i.prop('name')+'?callback=window.parent.'+cb).submit();
        };
        
      } else {

        savefn = function(data) {
          savingfn();
          
          data = data || e.value;
          
          $.ajax({
            url: '/Ajax/user.php/'+$i.prop('name'),
            type: 'PUT',
            data: data,

            success: function(r,status,xhr) {
              var enable = true;

              if (xhr.status === 202) {
                $('<p class="alert alert-info alert-dismissible" role="alert"></p>')
                  .text(r)
                  .prepend('<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>')
                  .insertAfter($i)
                ;

              } else if ($i[0].name === 'typeof_investor') {

                if (e.oldValue === 'enterprise') {
                  $('#settings-enterprise-wrap').html('');

                } else if (e.value === 'enterprise') {
                  var w = $('#settings-enterprise-wrap');
                  if (!w.html().trim()) { //Other methods doesn't working properly because Chrome & FF consider whitespaces and linebreaks as elements
                    enable = false;
                    $.get('/settings/enterprise/?nodecorate', function (data) {
                      w.html(data);
                      change_investor_type(true);
                      enablefn();
                    });
                  }
                }

              } else {
                var data = JSON.parse(r);
                var name;
                var field;
                for (name in data) {
                  if ($.inArray(name, ['name', 'surname', 'birth_year']) !== -1) {
                    cleanError($('[name="'+name+'"]').control('value', data[name]).control('close')[0]);
                  } else {
                    field = $i.closest('form').find('[name="'+name+'"]');
                    if (field.length) {
                      field = field.first();
                      if ($.inArray(field.prop('type'), ['checkbox', 'radio', 'password']) === -1) {
                        cleanError(field.control('value', data[name]).control('close')[0]);
                      }
                    }
                  }
                }
              }

              if (enable) {
                enablefn();
              }
            },

            error: function(r) {
              //if (r.status===409/*Conflict*/ && $i[0].name === 'e_id_number') {
                //cif exists
              //} else {
                 enablefn(r.status===404? o.strings.error404 : r.responseText);
              //}
            }
          });
        };
        
      }
      
      if (this.name === 'email' || this.name === 'password') {
        $('#confirm-pass-modal').data('ok', false).modal('show').one('hide.bs.modal', function () {
          if ($(this).data('ok')) {
            var $p = $('#confirm-pass');
            var data = {};
            data[e.target.name] = e.value;
            data[$p[0].name] = $p[0].value;
            savefn(data);
          } else {
            $i.control('value', e.oldValue).blur();
          }
        }).one('shown.bs.modal', function () {
          $('#confirm-pass').focus();
        });
      } else {
        savefn();
      }
    });
    
    $(document).on('submit', '#confirm-pass-modal form', function () {
      $('#confirm-pass-modal').data('ok', true).modal('hide');
      return false;
    });
  });
}


//CONTROL PLUGIN
var Control = function (element) {
  this.$element = $(element);
  this.editing  = false;
  this.oldValue = null;
  this.type = this.$element.prop('tagName').toLowerCase();
  
  if (this.type === 'input') {
    this.type = this.$element.prop('type');
    if ($.inArray(this.type, ['checkbox', 'radio', 'file']) === -1) {
      this.type = 'text';
    }
  }
  
  if (this.type === 'text' || this.type === 'textarea') {
    this.$element.on('keyup', $.proxy(function (e) {
      if (this.type === 'text') {
        if (e.keyCode === 13) {
          this.done();
        }
      }
      if (e.keyCode === 27) {
        this.cancel();
      }
    }, this));
  }
};

Control.prototype.getInputs = function() {
  if (!this.$element[0].name) {
    return this.$element;
  }
  var $parent = this.$element.closest('body, form');
  var $inputs = $parent.find(':input[name='+this.$element[0].name+']');
  if ($parent.is('body')) {
    $inputs.not('form :input');
  }
  return $inputs;
};

Control.prototype.value = function(v) {
  var $e = this.$element;
  var $inputs;
  var i = -1;
  var $i;
  
  //SET VALUE
  if (arguments.length) {
    if (this.type === 'radio') {
      $inputs = this.getInputs();
      while (++i < $inputs.length) {
        $i = $($inputs[i]);
        $i.prop('checked', $i.val() === v);
      }
    } else if (this.type === 'checkbox') {
      if (Array.isArray(v)) {
        $inputs = this.getInputs();
        while (++i < $inputs.length) {
          $i = $($inputs[i]);
          $i.prop('checked', $.inArray($i.val(), v) !== -1);
        }
      } else {
        $e.prop('checked', $e.val() === v);
      }
    } else {
      $e.val(v);
    }
    
    $e.change();
    return;
  }

  //GET VALUE
  if (this.type === 'radio') {
    $inputs = this.getInputs().filter(':checked');
    return $inputs.length? $inputs.val() : null;
  }
  
  if (this.type === 'checkbox') {
    $inputs = this.getInputs();
    if ($inputs.length <= 1) {
      return $inputs.is(':checked')? $inputs.val() : null;
    }
    var val = [];
    $inputs.filter(':checked').each(function() {
      val.push($(this).val());
    });
    return val;
  }
  
  return $e.val();
};

Control.prototype.edit = function () {
  if (this.editing) {
    return;
  }
  
  //console.log('edit: '+this.$element[0].name);
  
  var e = $.Event('edit.app.Control');
  this.$element.trigger(e);
  if (e.isDefaultPrevented()) {
    return;
  }

  this.oldValue = this.value();
  this.editing = true;
};

Control.prototype.cancel = function () {
  if (!this.editing) {
    return;
  }
  
  //console.log('cancel: '+this.$element[0].name);
  
  var e = $.Event('cancel.app.Control');
  e.oldValue = this.oldValue;
  this.$element.trigger(e);
  if (e.isDefaultPrevented()) {
    return;
  }
  
  if (this.value() !== this.oldValue) {
    this.value(this.oldValue);
  }
  
  this.close();
};

Control.prototype.done = function () {
  if (!this.editing) {
    return;
  }
  
  var $e = this.$element;
  var v = this.value();
  
  if (v !== this.oldValue || this.type === 'file') {
    //console.log('done: '+$e[0].name);

    var e = $.Event('changed.app.Control');
    e.oldValue = this.oldValue;
    e.value = v;

    $e.trigger(e);

    if (e.isDefaultPrevented()) {
      return;
    }
  }
  
  this.close();
};

Control.prototype.close = function () {
  if (!this.editing) {
    return;
  }
  
  //console.log('close: '+this.$element[0].name);
  
  var $e = this.$element;
  var e = $.Event('close.app.Control');
  $e.trigger(e);
  if (e.isDefaultPrevented()) {
    return;
  }

  this.editing = false;
  this.oldValue = null;
  
  if ($e.is(":focus")) {
    $e.blur();
  }
  
  $e.trigger('closed.app.Control');
};

Control.prototype.disable = function () {
  if (this.editing) {
    this.close();
  }
  
  if (this.type !== 'checkbox' && this.type !== 'radio') {
    var $inputs = this.getInputs();
    $inputs.each(function () {
      $(this).control('cancel').prop('disabled', true);
    });
  } else {
    this.$element.prop('disabled', true);
  }
};

Control.prototype.enable = function () {
  if (this.type !== 'checkbox' && this.type !== 'radio') {
    var $inputs = this.getInputs();
    $inputs.each(function () {
      $(this).prop('disabled', false);
    });
  } else {
    this.$element.prop('disabled', false);
  }
};

$.fn.control = function (option) {
  var args = Array.prototype.slice.call(arguments, 1);
  var i = -1;
  while (++i < this.length) {
    var c     = this[i];
    var $c    = $(c);
    var data  = $c.data('app.control');

    if (data || ! /cancel/.test(option)) {
      if (!data) {
        $c.data('app.control', (data = new Control(c)));
      }

      if (typeof option === 'string') {
        var r = data[option].apply(data, args);
        if (option === 'value' && !args.length || option === 'getInputs') {
          return r;
        }
      }
    }
  }
  return this;
};

$(document)
  .on('focus.app.Control', ':input', function () {
    $(this).control('edit');
  })
  .on('click.app.Control', '[data-dismiss=control]', function () {
    var b = $(this);
    $(b.data('target') || b.attr('href')).control('cancel');
    return false;
  })
  .on('click.app.Control', '[data-save=control]', function () {
    var b = $(this);
    $(b.data('target') || b.attr('href')).control('done');
    return false;
  })
  .on('change.app.Control blur.app.Control', ':input', function (e) {
    var $c = $(this);
    var data = $c.data('app.control');
    
    if (!data || !data.editing) {
      return;
    }
    
    if (e.type === 'change') {
      
      if ((data.type === 'text' || data.type === 'textarea')) {
        return;
      }
    
    } else {
      
      if (data.type === 'file') {
        return;
      }
    
      //Check if is a cancel click
      var b = e.relatedTarget && $(e.relatedTarget);
      if (b && b.data('dismiss') === 'control') {
        var s = '#'+e.target.id;
        if (b.data('target') === s || b.attr('href') === s) {
          $c.control('cancel');
          return;
        }
      }
    }
    $c.control('done');
  });
