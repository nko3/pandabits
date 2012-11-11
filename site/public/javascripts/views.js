(function(app) {
    KEYCODES = {
        ENTER : 13,
        UP_ARROW: 38,
        DOWN_ARROW: 40,
        LEFT_ARROW: 37,
        RIGHT_ARROW: 39,
        PAGE_DOWN: 34,
        PAGE_UP: 33,
        SPACE_BAR: 32,
        TAB: 9,
        ESCAPE: 27,
        BREAK: 19
    };
        
    $(window).on("keydown", function(e) {
        if (e.shiftKey && e.keyCode === KEYCODES.ESCAPE) {
            App.sendMessage("!pause");
            return false;
        } 
        
        return true;
    });
    
    var UsernameView = app.UsernameView = Backbone.View.extend({
        initialize: function() {
            this.$input = this.$("input");  
        },
        
        events: {
            "click .edit-pencil": "onEditClicked",
            "blur input": "onValueChanged",
            "keydown input": "onKeyDown"
        },
            
        onKeyDown: function(e) {
            // If there is a shift press, just return true
            if (e.shiftKey) { 
                return true;
            }
            
            if (e.keyCode === KEYCODES.ENTER) {
                this.$input.blur();
                return false;
            }
        },
        
        onEditClicked: function(e) {
            e.stopPropagation();
            e.preventDefault();
            
            this.$input.focus();
        },
        
        onValueChanged: function(e) {
            var newUsername = (this.$input.val() || "").trim();
            App.currentUser.set("name", newUsername);
        }
    });
    
    var FileView = app.FileView = Backbone.View.extend({
        tagName: "div",
        className: "tab-pane",
        
        initialize: function() {
            this.breakpoints = {};  
            
            App.breakpoints.on("add", this.onBreakpointAdded, this);
            App.breakpoints.on("remove", this.onBreakpointRemoved, this);
            this.model.on("change:highlight", this.highlightLine, this);
        },
        
        onBreakpointRemoved: function(breakpoint) {
            if (breakpoint.get("script_name") !== this.model.get("path")) {
                return;
            }
            
            var line = breakpoint.get("line");
            var $target = this.$("a[data-line=" + line + "] i");
            
            $target.addClass("icon-blank");
            $target.removeClass("icon-exclamation-sign");
            this.$("pre span[data-line=" + line + "]").removeClass("breakpointset");
        },
        
        onBreakpointAdded: function(breakpoint) {
            if (breakpoint.get("script_name") !== this.model.get("path")) {
                return;
            }
            
            var line = breakpoint.get("line");
            var $target = this.$("a[data-line=" + line + "] i");
            
            $target.removeClass("icon-blank");
            $target.addClass("icon-exclamation-sign");
            this.$("pre span[data-line=" + line + "]").addClass("breakpointset");
        },
        
        highlightLine: function() {
            var prevLine = this.model.previous("highlight");
            var line = this.model.get("highlight");
            
            this.$("pre span[data-line=" + prevLine + "]").removeClass("currentline");
            
            if (this.model.has("highlight")) {
                var highlightedLine = this.$("pre span[data-line=" + line + "]");
                highlightedLine.addClass("currentline");
                
                var currentOffset = this.$el.parent().scrollTop() || 0;
                
                this.$el.parent().scrollTo(highlightedLine, { duration: 0, offsetTop: 100});
            }
        },
        
        render: function() {
            var model = this.model.toJSON();
            model.lines = model.code.split("\n");
            this.$el.html(_.template(FileView.template, model));
            
            this.$el.attr("data-file", this.model.get("path"));
            this.$el.attr("id", "file-tab-content" + this.model.cid);
            
            return this;
        },
        
        events: {
            "click .breakpoints p": "onBreakpointClicked",
        },
        
        onBreakpointClicked: function(e) {
            e.stopPropagation();
            e.preventDefault();
            
            var line = $(e.currentTarget).find("a").attr("data-line");
            var enabled = !!this.breakpoints[line];
            this.breakpoints[line] = !enabled;
            
            var that = this;
            if (enabled) {
                var command = "!rbp " + this.model.get("path") + ":" + line;
                App.sendMessage(command);
            }
            else {
                var command = "!sbp " + this.model.get("path") + ":" + line;
                App.sendMessage(command);
            }
        }
    },{
        template: ' \
<table class="file-table"> \
    <tbody> \
        <tr> \
            <td class="linenos" valign="top"> \
            <% for(var i = 0; i < lineCount; i++) { %> \
                <p style="text-align: right;"><%= i+1 %></p> \
            <% } %> \
            <td class="linenos breakpoints" valign="top"> \
            <% for(var i = 0; i < lineCount; i++) { %> \
                <p style="text-align: right;"> \
                    <a href="#" data-line="<%= i %>"> \
                        <i class="icon-blank"></i> \
                    </a> \
                </p> \
            <% } %> \
            </td> \
            <td valign="top"> \
                <pre><% for(var i = 0; i < lines.length; i++) { %><span data-line="<%= i %>"><%= lines[i] %></span>\n<% } %></pre> \
            </td> \
        </tr> \
    </tbody> \
</table> \
'        
    });
    
    var FilesView = app.FilesView = Backbone.View.extend({
        className: "file-tabs tabbable tabs-below",
        
        initialize: function() {
            var views = this.views = {};
            this.collection.each(function(file) {
                views[file.get("id")] = new FileView({model: file});
            });
            
            this.collection.on("add", this.onFileAdded, this);  
            this.collection.on("remove", this.onFileRemoved, this);
            this.collection.on("reset", this.onFilesReset, this);
            
            App.on("change:active", this.onActiveFileChanged, this);
        },
        
        onActiveFileChanged: function(file) {
            var $target = this.$("a[href=#file-tab-content" + file.cid + "]");
            $target.click();
            
            var currentOffset = this.$("ul.nav").scrollLeft();
            this.$("ul.nav").scrollLeft(
                currentOffset + $target.parent().offset().left
            );
            
            this.$(".file-header").text(file.get("path"));
        },
        
        onFileAdded: function(file) {
            var view = this.views[file.get("id")] = new FileView({model: file});
            
            this.addFileTab(file, view);
        },
        
        onFileRemoved: function(file) {
            var view = this.views[file.get("id")];
            delete this.views[file.get("id")];
            
            this.removeFileTab(file, view);
        },
        
        onFilesReset: function(files) {
            _.each(this.views, function(view) {
                view.remove(); 
            });
            
            var views = this.views = {};
            this.collection.each(function(file) {
                views[file.get("id")] = new FileView({model: file});
            });
            
            this.render();
        },
        
        render: function() {
            var infos = this.collection.map(function(file) {
                return { id: file.get("id"), path: file.get("path") };
            });
            
            this.$el.html(_.template(FilesView.template, {infos: infos}));
            
            var els = [];
            _.each(this.views, function(view, id) {
                els.push(view.render().el);
            });
            this.$(".tab-content").append(els);
            
            this.ensureTabSelected();
            
            return this;
        },
        
        addFileTab: function(file, view) {
            var path = file.get("path") || "";
            var template = '<li><a href="#file-tab-content<%= id %>" data-id="<%= id %>" data-file="<%= path %>" data-toggle="tab"><%= path %></a></li>';
            this.$("ul.nav").append($(_.template(template, {
                id: file.cid,
                path: path.slice(path.lastIndexOf("/") + 1)
            })));
            
            this.$(".tab-content").append(view.render().el);
            
            this.ensureTabSelected();
        },
        
        removeFileTab: function(file, view) {
            this.$(".nav li a[data-file='" + file.get("id") + "']").remove();
            this.$("#file-tab-content" + file.get("id")).remove();
            
            this.ensureTabSelected();
            
            return this;
        },
        
        ensureTabSelected: function() {
            var tabs = this.$(".nav li.active");
            
            if (tabs.length === 0) {
                this.$(".nav li a").last().click();
                //this.$(".tab-content div.tab-pane").first().addClass("active");
            }
        },
        
        events: {
            "shown a[data-toggle='tab']": "onTabShown"
        },
        
        onTabShown: function(e) {
            var fileCid = $(e.target).attr("data-id");
            var file = this.collection.getByCid(fileCid);
            
            this.$(".file-header").text(file.get("path"));
        }
    },{
        template: ' \
<div class="file-header">No open files...</div> \
<div class="tab-content"></div> \
<ul class="nav nav-tabs"> \
<% _.each(infos, function(info) { %> \
  <li><a href="#file-tab-content<%= info.cid %>" data-file="<%= info.path %>" data-id="<%= info.cid%>" data-toggle="tab"><%= info.path %></a></li> \
<% }) %> \
</ul>  \
'
    });
    
    var MessageContentView = Backbone.View.extend({
        initialize: function(options) {
            this.id = options.message.cid;
            this.content = options.message.get('content');
        },
        
        render: function() {
            this.$el.html('');
            this.$el.text(this.content.data);
            
            return this;
        }
    });
    
    var HelpContentView = Backbone.View.extend({
        initialize: function(options) {
            this.id = options.message.cid;
            this.content = options.message.get('content');
        },
        
        render: function() {            
            this.$el.html(_.template(HelpContentView.template, {
                original: this.content.original,
                help: this.content.data
            }));
            
            return this;
        }
    },{
        template: ' \
<div> \
    &gt;&gt;&nbsp<%= original %> \
</div> \
<pre><%= help %></pre> \
'
    });
    
    var OutputContentView = Backbone.View.extend({
        initialize: function(options) {
            this.message = options.message;
            this.id = options.message.cid;
            this.content = options.message.get('content');
        },
        
        updateContent: function(newContent) {
            this.$("pre").text(newContent);
        },
        
        render: function() {            
            this.$el.html(_.template(OutputContentView.template, {
                type: this.content.type,
                output: this.content.data
            }));
            
            return this;
        }
    },{
        template: ' \
<pre class="output-<%= type %>"><%= output %></pre> \
'
    });
    
    var CommandContentView = Backbone.View.extend({
        initialize: function(options) {
            this.id = options.message.cid;
            this.content = options.message.get('content');
        },
        
        render: function() {            
            this.$el.html(_.template(CommandContentView.template, {
                original: this.content.original,
                error: this.content.error,
                data: _.isString(this.content.data) ? this.content.data : ""
            }));
            
            return this;
        }
    },{
        template: ' \
<div> \
    &gt;&gt;&nbsp<%= original %> \
</div> \
<% if(error) { %> \
    <%= error %> \
<% } else if (data) { %> \
    <%= data %> \
<% } %> \
'
    });
    
    var ChatContentView = Backbone.View.extend({
        initialize: function(options) {
            this.id = options.message.cid;
            this.content = options.message.get('content');
        },
        
        render: function() {            
            this.$el.html(_.template(ChatContentView.template, {
                data: this.content.data
            }));
            
            return this;
        }
    },{
        template: '<%= data %>'
    });
    
    var SystemMessageContentView = Backbone.View.extend({
        initialize: function(options) {
            this.id = options.message.cid;
            this.content = options.message.get('content');
        },
        
        render: function() {            
            this.$el.html(_.template(SystemMessageContentView.template, {
                data: this.content.data
            }));
            
            return this;
        }
    },{
        template: '<%= data %>'
    });
    
    var BreakpointCommandContentView = Backbone.View.extend({
        initialize: function(options) {
            this.id = options.message.cid;
            this.content = options.message.get('content');
        },
        
        render: function() {            
            this.$el.html(_.template(BreakpointCommandContentView.template, {
                original: this.content.original,
                error: this.content.error,
                data: this.content.data,
                isAdd: this.content.type === "setbreakpoint"
            }));
            
            return this;
        }
    },{
        template: ' \
<div> \
    &gt;&gt;&nbsp<%= original %> \
</div> \
<% if(error) { %> \
    <%= error %> \
<% } else if (isAdd) { %> \
    <span><%= data.breakpoint %>: </span><%= data.script_name %>:<%= data.line %> \
<% } else { %> \
    <span>Breakpoint \'<%= data.breakpoint %>\' was removed \
<% } %> \
'
    });
    
    var EvaluateContentView = Backbone.View.extend({
        initialize: function(options) {
            this.id = options.message.cid;
            this.content = options.message.get('content');
        },
        
        render: function() {            
            this.$el.html(_.template(EvaluateContentView.template, {
                original: this.content.original,
                error: this.content.error,
                isObject: this.content.error ? false : _.isObject(this.content.data),
                isArray: this.content.error ? false :_.isArray(this.content.data)
            }));
            
            if (this.content.data) {
                if (_.isObject(this.content.data) || _.isArray(this.content.data)) {
                    var target = this.$(".evaluate-content");
                    JSONFormatter.format(this.content.data, {
                        appendTo: target,
                        list_id: "jsonfoo" + this.id,
                        collapse: true
                    });
                }
                else {
                    this.$(".evaluate-content").text(this.content.data);
                }
            }
            
            return this;
        }
    },{
        template: ' \
<div> \
    &gt;&gt;&nbsp<%= original %> \
</div> \
<% if(error) { %> \
    <%= error %> \
<% } %> \
<% if (isObject || isArray) { print(isArray ? "[" : "{") } %> \
<div class="evaluate-content"></div> \
<% if (isObject || isArray) { print(isArray ? "]" : "}") } %> \
'
    });
    
    var BacktraceContentView = Backbone.View.extend({
        initialize: function(options) {
            this.id = options.message.cid;
            this.content = options.message.get('content');
        },
        
        render: function() {            
            this.$el.html(_.template(BacktraceContentView.template, this.content));
            
            return this;
        }
    },{
        template: ' \
<div> \
    &gt;&gt;&nbsp<%= original %> \
</div> \
<% if(error) { %> \
    <%= error %> \
<% } else { %> \
<table class="backtrace-table command-resposne"> \
    <tbody> \
    <% _.each(data.frames, function(frame, idx) { %> \
        <tr> \
            <td class="backtrace-index"><%= idx %><% print (App.currentFrame === idx ? "*" : "") %></td> \
            <td class="backtrace-file"><%= frame.script.name %>:<%= frame.line %></td> \
        </tr> \
    <% }) %> \
    </tbody> \
</table> \
<% } %> \
'
    });
    
    var ListBreakpointsContentView = Backbone.View.extend({
        initialize: function(options) {
            this.id = options.message.cid;
            this.content = options.message.get('content');
        },
        
        render: function() {   
            var error = this.content.error;
            var data = this.content.data;
            var breakpoints = data.breakpoints;
            
            this.$el.html(_.template(ListBreakpointsContentView.template, {
                original: this.content.original,
                error: error || (breakpoints.length === 0 ? "No breakpoints" : null),
                data: this.content.data
            }));
            
            return this;
        }
    },{
        template: ' \
<div> \
    &gt;&gt;&nbsp<%= original %> \
</div> \
<% if(error) { %> \
    <%= error %> \
<% } else { %> \
<table class="breakpoint-table command-resposne"> \
    <tbody> \
    <% _.each(data.breakpoints, function(breakpoint, idx) { %> \
        <tr> \
            <td class="breakpoint-index"><%= breakpoint.number %><% print(breakpoint.active ? "(e)" : "(d)") %></td> \
            <td class="breakpoint-file"><%= breakpoint.script_name %>:<%= breakpoint.line %></td> \
        </tr> \
    <% }) %> \
    </tbody> \
</table> \
<% } %> \
'
    });
    
    var ScriptsCommandContentView = Backbone.View.extend({
        initialize: function(options) {
            this.id = options.message.cid;
            this.content = options.message.get('content');
        },
        
        render: function() {   
            var error = this.content.error;
            var data = this.content.data;
            var scripts = data;
            
            this.$el.html(_.template(ScriptsCommandContentView.template, {
                original: this.content.original,
                error: error || (scripts.length === 0 ? "No scripts." : null),
                data: this.content.data
            }));
            
            return this;
        }
    },{
        template: ' \
<div> \
    &gt;&gt;&nbsp<%= original %> \
</div> \
<% if(error) { %> \
    <%= error %> \
<% } else { %> \
<table class="breakpoint-table command-resposne"> \
    <tbody> \
    <% _.each(data, function(script, idx) { %> \
        <tr> \
            <td class="breakpoint-index"><%= idx+1 %></td> \
            <td class="breakpoint-file"><%= script.name %></td> \
        </tr> \
    <% }) %> \
    </tbody> \
</table> \
<% } %> \
'
    });
    
    var FrameCommandContentView = Backbone.View.extend({
        initialize: function(options) {
            this.id = options.message.cid;
            this.content = options.message.get('content');
        },
        
        render: function() {            
            this.$el.html(_.template(FrameCommandContentView.template, {
                original: this.content.original,
                error: this.content.error,
                data: this.content.data
            }));
            
            return this;
        }
    },{
        template: ' \
<div> \
    &gt;&gt;&nbsp<%= original %> \
</div> \
<% if(error) { %> \
    <%= error %> \
<% } else { %> \
    Frame \'<%= data.frame %>\' is now the current frame.\
<% } %> \
'
    });
    
    var BreakCommandContentView = Backbone.View.extend({
        initialize: function(options) {
            this.id = options.message.cid;
            this.content = options.message.get('content');
        },
        
        render: function() {            
            this.$el.html(_.template(BreakCommandContentView.template, {
                original: this.content.original,
                error: this.content.error,
                data: this.content.data
            }));
            
            return this;
        }
    },{
        template: ' \
Debugger is now paused (<%= data.data.script.name %>:<%=data.data.sourceLine %>). \
'
    });
    
    var ContentViews = {
        "backtrace": BacktraceContentView,
        "evaluate": EvaluateContentView,
        "message": MessageContentView,
        "setbreakpoint": BreakpointCommandContentView,
        "removebreakpoint": BreakpointCommandContentView,
        "listbreakpoints": ListBreakpointsContentView,
        "loadfile": CommandContentView,
        "break": CommandContentView,
        "go": CommandContentView,
        "scripts": ScriptsCommandContentView,
        "frame": FrameCommandContentView,
        "break": BreakCommandContentView,
        "help": HelpContentView,
        "stepin": CommandContentView,
        "stepover": CommandContentView,
        "stepout": CommandContentView,
        "stdout": OutputContentView,
        "stderr": OutputContentView,
        "chat": ChatContentView,
        "system": SystemMessageContentView,
        "command": CommandContentView
    };
    
    var StreamMessageView = app.StreamMessageView = Backbone.View.extend({
        className: "message-box",
        
        initialize: function() {            
            this.model.on("change:time", this.render, this);
            this.model.on("change:content", this.onContentChanged, this)
        },
        
        render: function() {
            this.$el.html(_.template(StreamMessageView.template, this.model.toJSON()));
          
            if (this.contentView) {
                this.contentView.render();
            }
            else {
                this.contentView = this.createContentView().render();
            }
            
            return this;
        },
        
        updateContent: function(content) {
            if (this.contentView) {
                this.contentView.updateContent(content);
            }  
        },
        
        updateTime: function() {
            this.$(".message-time").text(this.model.get("time"));  
        },
        
        createContentView: function() {                
            var content = this.model.get("content");
            var contentType = content.type;
            var contentData = content.data;
            
            if (!_.has(ContentViews, contentType)) {
                return;
            }
            
            this.contentView = new ContentViews[contentType]({
                message: this.model,
                el: this.$(".message-content")
            });
            
            return this.contentView;
        },
        
        onContentChanged: function() {
            this.createContentView();
            this.contentView.render();
        }
    },{
        template: ' \
<div class="message-header"> \
    <span class="message-user"><%= user %></span> \
    <span class="message-time"><%= time %></span> \
</div> \
<div class="message-content"></div> \
'
    });
    
    var StreamMessagesView = app.StreamMessagesView = Backbone.View.extend({
        className: "messages-view",
        
        initialize: function() {
            var views = this.views = {};
            this.collection.each(function(message) {
                var view = views[message.get("cid")] = new StreamMessageView({model: message}); 
                view.on("update", this.ensureScroll, this);
            });
                        
            this.collection.on("add", this.onMessageAdded, this);
            this.collection.on("change:output", this.onContentChanged, this);
        },
        
        onMessageAdded: function(message) {            
            var view = this.views[message.get("cid")] = new StreamMessageView({model: message});
            view.on("update", this.ensureScroll, this);
            
            this.addMessage(message, view);
        },
        
        onContentChanged: function(message) {
            var scrollTop = this.$el.scrollTop();
            var scrollHeight = this.$el.prop('scrollHeight');
            var outerHeight = this.$el.outerHeight()
            
            var scrolledAllTheWayDown = Math.abs(scrollHeight - scrollTop - outerHeight) < 20;
            
            var view = this.views[message.get("cid")];
            
            view.updateContent(message.get("content").data);
            
            var newScrollHeight = this.$el.prop('scrollHeight');
            if (scrolledAllTheWayDown) {
                this.$el.scrollTop(newScrollHeight);
            }
        },
        
        render: function() {
            this.$el.html('');
            
            var els = [];
            _.each(this.views, function(view) {
                els.push(view.render().el);
            });
            this.$el.append(els);
            
            return this;
        },
        
        addMessage: function(message, view) {
            var scrollTop = this.$el.scrollTop();
            var scrollHeight = this.$el.prop('scrollHeight');
            var outerHeight = this.$el.outerHeight()
            
            var scrolledAllTheWayDown = Math.abs(scrollHeight - scrollTop - outerHeight) < 20;
            
            this.$el.append(view.render().el);
            
            var newScrollHeight = this.$el.prop('scrollHeight');
            if (scrolledAllTheWayDown) {
                this.$el.scrollTop(newScrollHeight);
            }
        },
        
        ensureScroll: function() {
            
        }
    });
    
    var StreamToolbarView = app.StreamToolbarView = Backbone.View.extend({
        className: "navbar",
        tagName: "div",
        
        initialize: function() {            
        },
        
        render: function() {
            this.$el.html(_.template(StreamToolbarView.template));
                      
            this.popover = this.$(".help-sign a").popover({
                placement: "bottom",
                trigger: "click",
                title: "keyboard shortcuts",
                content: StreamToolbarView.shortcuts,
                html: true,
                offset: 50,
            });
            
            this.popover.on("shown", function() {
                console.log("SHOWN");
            })
                      
            return this;
        },
        
        events: {
            "click li a[data-control]": "onToolbarActionClicked"
        },
        
        onToolbarActionClicked: function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            var control = $(e.currentTarget).data("control");
            console.log("APP", App.isPaused, control);
            
            if (App.isPaused === "start") {
                App.sendMessage("!" + control);
            }
            else if (!App.isPaused) {
                switch(control) {
                    case "pause":
                    case "backtrace":
                    case "bps": {
                        App.sendMessage("!" + control);
                        break;
                    }
                }
            }
            else {
                switch(control) {
                    case "go":
                    case "stepin":
                    case "stepout":
                    case "stepover": {
                        App.sendMessage("!" + control);
                        break;
                    }
                }
            }
        }
    },{
        shortcuts: '\
<table> \
    <tbody> \
        <tr><td class="help-key">return</td><td>submit command</td></tr> \
        <tr><td class="help-key">shift+return</td><td>insert new line</td></tr> \
        <tr><td class="help-key">page up</td><td>go up in command history</td></tr> \
        <tr><td class="help-key">page down</td><td>go down in command history</td></tr> \
        <tr><td class="help-key">esc</td><td>clear command</td></tr> \
        <tr><td class="help-key">shift+esc</td><td>pause debugger</td></tr> \
    </tbody> \
</table> \
',
        template: ' \
<div class="navbar-inner"> \
    <ul class="nav"> \
        <li class=""><a href="#" data-control="go" title="continue"><i class="icon-play"></i></a></li> \
        <li class=""><a href="#" data-control="pause" title="pause"><i class="icon-pause"></i></a></li> \
        <li class=""><a href="#" data-control="stepin" title="step in"><i class="icon-chevron-down"></i></a></li> \
        <li class=""><a href="#" data-control="stepout" title="step out"><i class="icon-chevron-up"></i></a></li> \
        <li class=""><a href="#" data-control="stepover" title="step over"><i class="icon-chevron-right"></i></a></li> \
        <li class=""><a href="#" data-control="backtrace" title="backtrace"><i class="icon-th-list"></i></a></li> \
        <li class=""><a href="#" data-control="bps" title="breakpoints"><i class="icon-exclamation-sign"></i></a></li> \
    </ul> \
    <ul class="nav pull-right"> \
        <li class="help-sign"><a href="#" title="keyboard shortcuts"><i class="icon-question-sign"></i></a></li> \
    </ul> \
</div> \
'
    });
    
    var StreamInputView = app.StreamInputView = Backbone.View.extend({
        className: "stream-input",
        
        initialize: function(options) {
            this.messages = options.messages;
            this.commands = options.commands;
            this.counter = 10;
        },
        
        render: function() {
            this.$el.html(_.template(StreamInputView.template));
            
            this.$("textarea").autosize();
            
            return this;
        },
        
        events: {
            "click .submit-button": "onSubmitClicked",
            "keydown textarea": "onKeyDown"
        },
            
        onKeyDown: function(e) {
            // If there is a shift press, just return true
            if (e.shiftKey) { 
                return true;
            }
            
            if (e.keyCode === KEYCODES.ENTER) {
                this.onSubmitClicked();
                return false;
            }
            else if (e.keyCode === KEYCODES.PAGE_UP) {
                var cursor = this.commands.cursor = Math.max(0, this.commands.cursor - 1);
                var command = this.commands.at(cursor)
                
                this.$("textarea").val(command.get("text"));
                this.$("textarea").trigger("autosize");
            }
            else if (e.keyCode === KEYCODES.PAGE_DOWN) {
                var cursor = this.commands.cursor = Math.min(this.commands.length, this.commands.cursor + 1);
                var command = this.commands.at(cursor)
                
                this.$("textarea").val((command ? command.get("text") : '') || '');
                this.$("textarea").trigger("autosize");
            }
            else if (e.keyCode === KEYCODES.ESCAPE) {
                this.$("textarea").val('');
                this.$("textarea").trigger("autosize");
            }
        },
        
        onSubmitClicked: function(e) {
            var text = this.$("textarea").val();
            
            if (!text.trim()) {
                return;
            }
            
            var message = null;
            App.sendMessage(text);
            
            var cursor = this.commands.cursor;
            var command = this.commands.at(cursor);
            if (!command || command.get("text") !== text) {
                this.commands.add({
                    text: text
                });
                this.commands.cursor = this.commands.length;
            }
            else {
                this.commands.cursor = Math.min(this.commands.length, this.commands.cursor + 1);
            }
            
            
            this.$("textarea").val('');
            this.$("textarea").trigger("autosize");
        }
    },{
        template: ' \
<textarea class="debug-input"></textarea> \
'
    });
    
    var StreamView = app.StreamView = Backbone.View.extend({
        className: "stream-window",
        
        initialize: function(options) {
            this.toolbarView = new StreamToolbarView();
            this.messagesView = new StreamMessagesView({collection: options.messages});
            this.inputView = new StreamInputView({messages: options.messages, commands: options.commands});
        },
        
        render: function() {
            this.$el.append(this.toolbarView.render().el);
            this.$el.append(this.messagesView.render().el);
            this.$el.append(this.inputView.render().el);
            
            return this;
        },
    });
    
})(window.App);