(function(require) {
    (function() {
        var config = {
            map: {
                '*': {
                    cf: 'Firebear_CloudFlare/js/cf',
                    d3: 'Firebear_CloudFlare/js/d3/d3'
                }
            }
        };
        require.config(config);
    })();
    (function() {
        var config = {
            'waitSeconds': 0,
            'map': {
                '*': {
                    'ko': 'knockoutjs/knockout',
                    'knockout': 'knockoutjs/knockout',
                    'mageUtils': 'mage/utils/main',
                    'rjsResolver': 'mage/requirejs/resolver'
                }
            },
            'shim': {
                'jquery/jquery-migrate': ['jquery'],
                'jquery/jstree/jquery.hotkeys': ['jquery'],
                'jquery/hover-intent': ['jquery'],
                'mage/adminhtml/backup': ['prototype'],
                'mage/captcha': ['prototype'],
                'mage/common': ['jquery'],
                'mage/new-gallery': ['jquery'],
                'mage/webapi': ['jquery'],
                'jquery/ui': ['jquery'],
                'MutationObserver': ['es6-collections'],
                'moment': {
                    'exports': 'moment'
                },
                'matchMedia': {
                    'exports': 'mediaCheck'
                },
                'jquery/jquery-storageapi': {
                    'deps': ['jquery/jquery.cookie']
                }
            },
            'paths': {
                'jquery/validate': 'jquery/jquery.validate',
                'jquery/hover-intent': 'jquery/jquery.hoverIntent',
                'jquery/file-uploader': 'jquery/fileUploader/jquery.fileupload-fp',
                'prototype': 'legacy-build.min',
                'jquery/jquery-storageapi': 'jquery/jquery.storageapi.min',
                'text': 'mage/requirejs/text',
                'domReady': 'requirejs/domReady',
                'spectrum': 'jquery/spectrum/spectrum',
                'tinycolor': 'jquery/spectrum/tinycolor'
            },
            'deps': ['jquery/jquery-migrate'],
            'config': {
                'mixins': {
                    'jquery/jstree/jquery.jstree': {
                        'mage/backend/jstree-mixin': true
                    },
                    'jquery': {
                        'jquery/patches/jquery': true
                    }
                },
                'text': {
                    'headers': {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                }
            }
        };
        require(['jquery'], function($) {
            'use strict';
            $.noConflict();
        });
        require.config(config);
    })();
    (function() {
        var config = {
            'shim': {
                'extjs/ext-tree': ['prototype'],
                'extjs/ext-tree-checkbox': ['extjs/ext-tree', 'extjs/defaults'],
                'jquery/editableMultiselect/js/jquery.editable': ['jquery']
            },
            'bundles': {
                'js/theme': ['globalNavigation', 'globalSearch', 'modalPopup', 'useDefault', 'loadingPopup', 'collapsable']
            },
            'map': {
                '*': {
                    'translateInline': 'mage/translate-inline',
                    'form': 'mage/backend/form',
                    'button': 'mage/backend/button',
                    'accordion': 'mage/accordion',
                    'actionLink': 'mage/backend/action-link',
                    'validation': 'mage/backend/validation',
                    'notification': 'mage/backend/notification',
                    'loader': 'mage/loader_old',
                    'loaderAjax': 'mage/loader_old',
                    'floatingHeader': 'mage/backend/floating-header',
                    'suggest': 'mage/backend/suggest',
                    'mediabrowser': 'jquery/jstree/jquery.jstree',
                    'tabs': 'mage/backend/tabs',
                    'treeSuggest': 'mage/backend/tree-suggest',
                    'calendar': 'mage/calendar',
                    'dropdown': 'mage/dropdown_old',
                    'collapsible': 'mage/collapsible',
                    'menu': 'mage/backend/menu',
                    'jstree': 'jquery/jstree/jquery.jstree',
                    'details': 'jquery/jquery.details'
                }
            },
            'deps': ['js/theme', 'mage/backend/bootstrap', 'mage/adminhtml/globals'],
            'paths': {
                'jquery/ui': 'jquery/jquery-ui-1.9.2'
            }
        };
        require.config(config);
    })();
    (function() {
        var config = {
            map: {
                '*': {
                    'mediaUploader': 'Magento_Backend/js/media-uploader'
                }
            }
        };
        require.config(config);
    })();
    (function() {
        var config = {
            map: {
                '*': {
                    rolesTree: 'Magento_User/js/roles-tree',
                    deleteUserAccount: 'Magento_User/js/delete-user-account'
                }
            }
        };
        require.config(config);
    })();
    (function() {
        var config = {
            map: {
                '*': {
                    eavInputTypes: 'Magento_Eav/js/input-types'
                }
            }
        };
        require.config(config);
    })();
    (function() {
        var config = {
            map: {
                '*': {
                    systemMessageDialog: 'Magento_AdminNotification/system/notification',
                    toolbarEntry: 'Magento_AdminNotification/toolbar_entry'
                }
            }
        };
        require.config(config);
    })();
    (function() {
        var config = {
            paths: {
                'customer/template': 'Magento_Customer/templates'
            },
            map: {
                '*': {
                    addressTabs: 'Magento_Customer/edit/tab/js/addresses',
                    dataItemDeleteButton: 'Magento_Customer/edit/tab/js/addresses',
                    observableInputs: 'Magento_Customer/edit/tab/js/addresses'
                }
            }
        };
        require.config(config);
    })();
    (function() {
        var config = {
            map: {
                '*': {
                    folderTree: 'Magento_Cms/js/folder-tree'
                }
            }
        };
        require.config(config);
    })();
    (function() {
        var config = {
            map: {
                '*': {
                    popupWindow: 'mage/popup-window',
                    confirmRedirect: 'Magento_Security/js/confirm-redirect'
                }
            }
        };
        require.config(config);
    })();
    (function() {
        var config = {
            map: {
                '*': {
                    categoryForm: 'Magento_Catalog/catalog/category/form',
                    newCategoryDialog: 'Magento_Catalog/js/new-category-dialog',
                    categoryTree: 'Magento_Catalog/js/category-tree',
                    productGallery: 'Magento_Catalog/js/product-gallery',
                    baseImage: 'Magento_Catalog/catalog/base-image-uploader',
                    productAttributes: 'Magento_Catalog/catalog/product-attributes',
                    categoryCheckboxTree: 'Magento_Catalog/js/category-checkbox-tree'
                }
            },
            deps: ['Magento_Catalog/catalog/product'],
            config: {
                mixins: {
                    'Magento_Catalog/js/components/use-parent-settings/select': {
                        'Magento_Catalog/js/components/use-parent-settings/toggle-disabled-mixin': true
                    },
                    'Magento_Catalog/js/components/use-parent-settings/textarea': {
                        'Magento_Catalog/js/components/use-parent-settings/toggle-disabled-mixin': true
                    },
                    'Magento_Catalog/js/components/use-parent-settings/single-checkbox': {
                        'Magento_Catalog/js/components/use-parent-settings/toggle-disabled-mixin': true
                    }
                }
            }
        };
        require.config(config);
    })();
    (function() {
        var config = {
            map: {
                '*': {
                    orderEditDialog: 'Magento_Sales/order/edit/message'
                }
            }
        };
        require.config(config);
    })();
    (function() {
        var config = {
            map: {
                '*': {
                    integration: 'Magento_Integration/js/integration'
                }
            }
        };
        require.config(config);
    })();
    (function() {
        var config = {
            paths: {
                'ace': 'Firebear_ImportExport/js/lib/ace',
                'selectize': 'Firebear_ImportExport/js/lib/selectize'
            }
        };
        require.config(config);
    })();
    (function() {
        var config = {
            map: {
                '*': {
                    groupedProduct: 'Magento_GroupedProduct/js/grouped-product'
                }
            }
        };
        require.config(config);
    })();
    (function() {
        var config = {
            map: {
                '*': {
                    fptAttribute: 'Magento_Weee/js/fpt-attribute'
                }
            }
        };
        require.config(config);
    })();
    (function() {
        var config = {
            map: {
                '*': {
                    testConnection: 'Magento_AdvancedSearch/js/testconnection'
                }
            }
        };
        require.config(config);
    })();
    (function() {
        var config = {
            shim: {
                'tiny_mce_4/tinymce.min': {
                    exports: 'tinyMCE'
                }
            },
            paths: {
                'ui/template': 'Magento_Ui/templates'
            },
            map: {
                '*': {
                    uiElement: 'Magento_Ui/js/lib/core/element/element',
                    uiCollection: 'Magento_Ui/js/lib/core/collection',
                    uiComponent: 'Magento_Ui/js/lib/core/collection',
                    uiClass: 'Magento_Ui/js/lib/core/class',
                    uiEvents: 'Magento_Ui/js/lib/core/events',
                    uiRegistry: 'Magento_Ui/js/lib/registry/registry',
                    consoleLogger: 'Magento_Ui/js/lib/logger/console-logger',
                    uiLayout: 'Magento_Ui/js/core/renderer/layout',
                    buttonAdapter: 'Magento_Ui/js/form/button-adapter',
                    tinymce4: 'tiny_mce_4/tinymce.min',
                    wysiwygAdapter: 'mage/adminhtml/wysiwyg/tiny_mce/tinymce4Adapter'
                }
            }
        };
        require.config(config);
    })();
    (function() {
        var config = {
            map: {
                '*': {
                    swatchesProductAttributes: 'Magento_Swatches/js/product-attributes'
                }
            }
        };
        require.config(config);
    })();
    (function() {
        var config = {
            map: {
                '*': {
                    newVideoDialog: 'Magento_ProductVideo/js/new-video-dialog',
                    openVideoModal: 'Magento_ProductVideo/js/video-modal'
                }
            }
        };
        require.config(config);
    })();
    (function() {
        var config = {
            shim: {
                acceptjs: {
                    exports: 'Accept'
                },
                acceptjssandbox: {
                    exports: 'Accept'
                }
            },
            paths: {
                acceptjssandbox: 'https://jstest.authorize.net/v1/Accept',
                acceptjs: 'https://js.authorize.net/v1/Accept'
            }
        };
        require.config(config);
    })();
    (function() {
        var config = {
            map: {
                '*': {
                    transparent: 'Magento_Payment/js/transparent',
                    'Magento_Payment/transparent': 'Magento_Payment/js/transparent'
                }
            }
        };
        require.config(config);
    })();
    (function() {
        var config = {
            shim: {
                'Magento_Tinymce3/tiny_mce/tiny_mce_src': {
                    'exports': 'tinymce'
                }
            },
            map: {
                '*': {
                    'tinymceDeprecated': 'Magento_Tinymce3/tiny_mce/tiny_mce_src'
                }
            }
        };
        require.config(config);
    })();
})(require);