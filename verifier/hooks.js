window.requestApiCalls = [];
(function(){ 
    var LOG_ENABLED = true;
    if(!window.installedFunctionInstrumentations){ // only instrument once
        window.installedFunctionInstrumentations = true;
        LOG_ENABLED && console.log('[[ Hooks ]] Init');

        /**
         * @Syntax new XMLHttpRequest().open(url)
         */
        var o_xmlhttprequest_open = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(){
            if(arguments.length >= 2){
                let url = arguments[1];
                LOG_ENABLED && console.log('[[ Hooks ]] Intercepted: XMLHttpRequest.open');
                window.requestApiCalls.push({'XMLHttpRequest.open(url)': url});
            }
            return o_xmlhttprequest_open.apply(this, arguments);
        }

        /**
         * @Syntax new XMLHttpRequest().send(body)
         */
        var o_xmlhttprequest_send = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function(){
            if(arguments.length >= 1){
                let body = arguments[0];
                LOG_ENABLED && console.log('[[ Hooks ]] Intercepted: XMLHttpRequest.send');
                window.requestApiCalls.push({'XMLHttpRequest.send': body});
            }
            return o_xmlhttprequest_send.apply(this, arguments);
        }


        /**
         * @Syntax new XMLHttpRequest().setRequestHeader(header, value)
         */
        var o_xmlhttprequest_setreqheader = XMLHttpRequest.prototype.setRequestHeader;
        XMLHttpRequest.prototype.setRequestHeader = function(){
            if(arguments.length >= 2){
                let headerName = arguments[0];
                let headerValue = arguments[1]
                LOG_ENABLED && console.log('[[ Hooks ]] Intercepted: XMLHttpRequest.setRequestHeader');
                window.requestApiCalls.push({'XMLHttpRequest.setRequestHeader(name)': headerName});
                window.requestApiCalls.push({'XMLHttpRequest.setRequestHeader(value)': headerValue});
            }
            return o_xmlhttprequest_setreqheader.apply(this, arguments);
        }


        /**
         * @Syntax fetch(resource, options); resource can be Request object, URL object or a uri string
         */
        var o_fetch = fetch;
        fetch = function(){
            // uri
            if(arguments.length >= 1){
              let resource = arguments[0]; 
              LOG_ENABLED && console.log('[[ Hooks ]] Intercepted: fetch.url');  
              
              if(typeof resource === 'string'){
                var arg = resource;
              }else if(resource instanceof URL){
                var arg = resource.toString();
              }else if(resource instanceof Request){
                var arg = resource.url;
              }else{
                // invalid case; should not happen
                var arg = 'dummy'; 
              }
              window.requestApiCalls.push({'fetch.url': arg});
            }
            // body
            if(arguments.length >= 2){
                let options = arguments[1];
                if(options && options.body){
                    LOG_ENABLED && console.log('[[ Hooks ]] Intercepted: fetch.body');
                    window.requestApiCalls.push({'fetch.body': options.body});
                }
            }
            return o_fetch.apply(this, arguments);
        }


        /**
         * @Syntax new WebSocket(url, protocols)
         */
        var o_websocket = WebSocket;
        WebSocket = function(){
            if(arguments.length >= 1){
                let url = arguments[0];
                LOG_ENABLED && console.log('[[ Hooks ]] Intercepted: WebSocket');
                window.requestApiCalls.push({'WebSocket': url});
            }
            return o_websocket.apply(this, arguments);
        }

        /**
         * @Syntax new WebSocket(url, protocols).send(data)
         */
        var o_websocket_send = WebSocket.prototype.send;
        WebSocket.prototype.send = function(){
            if(arguments.length > 0){
                let body = arguments[0];
                LOG_ENABLED && console.log('[[ Hooks ]] Intercepted: WebSocket.send');
                window.requestApiCalls.push({'WebSocket.send': body});
            }
            return o_websocket_send.apply(this, arguments); 
        }


        /**
         * @Syntax new EventSource(url, options)
         */
         var o_eventsource = EventSource;
         EventSource = function(){
            if(arguments.length > 0){
                let url = arguments[0];
                LOG_ENABLED && console.log('[[ Hooks ]] Intercepted: EventSource');
                window.requestApiCalls.push({'EventSource': url});
            }
            return o_eventsource.apply(this, arguments); 
         }


        /**
         * @Syntax open(url, target, windowFeatures)
         */
         var o_windowopen = window.open;
         window.open = function(){
            if(arguments.length > 0){
                let url = arguments[0];
                LOG_ENABLED && console.log('[[ Hooks ]] Intercepted: window.open');
                window.requestApiCalls.push({'window.open': url});
            }
            return o_windowopen.apply(this, arguments);
         }

        /**
         * @Syntax location.assign(url), location.replace(url), location.href
         */
        
        var o_locassign = window.location.assign;
        window.location.assign = function(){
            if(arguments.length > 0){
                let url = arguments[0];
                LOG_ENABLED && console.log('[[ Hooks ]] Intercepted: location.assign');
                window.requestApiCalls.push({'location.assign': url});
            }
            return o_locassign.apply(this, arguments);
        }
        var o_locreplace = window.location.replace;
        window.location.replace = function(){
            if(arguments.length > 0){
                let url = arguments[0];
                LOG_ENABLED && console.log('[[ Hooks ]] Intercepted: location.replace');
                window.requestApiCalls.push({'location.replace': url});
            }
            return o_locreplace.apply(this, arguments);
        }

        ///// cannot override Location.prototype with Object.defineProperty as it is read-only!
        // Object.defineProperty(Location.prototype, 'href', {
        //     set: function(value){
        //         LOG_ENABLED && console.log('[[ Hooks ]] Intercepted: location.href');
        //         window.requestApiCalls.push({'location.href': value});
        //         o_locassign(value);
        //     }
        // });

        window.addEventListener('beforeunload', (event) => {
            
            // cancel the event as stated by the standard.
            event.preventDefault();

            // chrome requires returnValue to be set.
            event.returnValue = '';

            // @note
            // triggers a confirm prompt;
            // when the prompt occurs, we cancel it with puppeteer
            // note that overriding window.confirm() function to always return false does not work here
            // as the effect of those functions are disabled in this event according to the spec. 
            // see: 
            //  -   https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event
            //  -   https://stackoverflow.com/questions/821011/prevent-a-webpage-from-navigating-away-using-javascript 
            
            var new_url = event.currentTarget.location.href;
            LOG_ENABLED && console.log('[[ Hooks ]] Intercepted: location change');
            window.requestApiCalls.push({'location.href': new_url});
            // window.requestApiCalls.push({'location.assign': new_url});
            // window.requestApiCalls.push({'location.replace': new_url});

        });


        /**
         * @Syntax scriptElement.src = value
         */
        Object.defineProperty(HTMLScriptElement.prototype, 'src', {
            set: function(value){
                LOG_ENABLED && console.log('[[ Hooks ]] Intercepted: script.src');
                window.requestApiCalls.push({'script.src': value});
                this.setAttribute('src', value);
            }
        });



        LOG_ENABLED && console.log('[[ Hooks ]] End');
    }
})();