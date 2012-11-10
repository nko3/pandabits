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
        ESCAPE: 27
    };
    
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
            
            console.log(this.$input);
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
        
        render: function() {
            this.$el.html(_.template(FileView.template, this.model.toJSON()));
            
            this.$el.attr("data-file", this.model.get("id"));
            this.$el.attr("id", "file-tab-content" + this.model.get("id"));
            
            return this;
        },
    },{
        template: "<pre><code><%= code %></code></pre>"
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
            var template = '<li><a href="#file-tab-content<%= id %>" data-file="<%= id %>" data-toggle="tab"><%= path %></a></li>';
            this.$("ul.nav").append($(_.template(template, {
                id: file.get("id"),
                path: file.get("path")
            })));
            
            this.ensureTabSelected();
            
            this.$(".tab-content").append(view.render().el);
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
                this.$(".nav li").first().addClass("active");
                this.$(".tab-content div.tab-pane").first().addClass("active");
            }
        }
    },{
        template: ' \
<div class="tab-content"></div> \
<ul class="nav nav-tabs"> \
<% _.each(infos, function(info) { %> \
  <li><a href="#file-tab-content<%= info.id %>" data-file="<%= info.id %>" data-toggle="tab"><%= info.path %></a></li> \
<% }) %> \
</ul>  \
'
    });
    
    var StreamInputView = app.StreamInputView = Backbone.View.extend({
        className: "stream-input",
        
        initialize: function(options) {
            this.messages = options.messages;
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
        },
        
        onSubmitClicked: function(e) {
            var text = this.$("textarea").val();
            
            if (!text.trim()) {
                return;
            }
            
            var message = null;
            var rawMessage = App.sendMessage(text, function(revised) {
                message.set({id: revised.id, time: revised.time});
            });
            message = new App.Message(rawMessage);
            this.messages.add(message);
            
            this.$("textarea").val('');
            this.$("textarea").trigger("autosize");
        }
    },{
        template: ' \
<textarea class="chat-input input-xlarge"></textarea> \
<button type="submit" class="submit-button btn">Go</button> \
'
    });
    
    var StreamMessageView = app.StreamMessageView = Backbone.View.extend({
        className: "message-box",
        
        initialize: function() {
            this.model.on("change:content", this.onContentChanged, this);
            this.model.on("change:time", this.render, this);
        },
        
        render: function() {
            this.$el.html(_.template(StreamMessageView.template, this.model.toJSON()));
            
            return this;
        },
        
        updateTime: function() {
            this.$(".message-time").text(this.model.get("time"));  
        },
        
        onContentChanged: function() {
            this.$(".message-content pre").text(this.model.get("content"));
        }
    },{
        template: ' \
<div class="message-header"> \
    <span class="message-user"><%= user %></span> \
    <span class="message-time"><%= time %></span> \
</div> \
<div class="message-content"> \
    <pre><%= content %></pre> \
</div> \
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
        },
        
        onMessageAdded: function(message) {            
            var view = this.views[message.get("cid")] = new StreamMessageView({model: message});
            view.on("update", this.ensureScroll, this);
            
            this.addMessage(message, view);
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
            var offsetHeight = this.$el.prop('offsetHeight');
            
            var scrolledAllTheWayDown = (scrollTop === (scrollHeight - offsetHeight));
            
            this.$el.append(view.render().el);
            
            var newScrollHeight = this.$el.prop('scrollHeight');
            if (scrolledAllTheWayDown) {
                this.$el.scrollTop(newScrollHeight);
            }
        },
        
        ensureScroll: function() {
            
        }
    });
    
    var StreamView = app.StreamView = Backbone.View.extend({
        className: "stream-window",
        
        initialize: function(options) {
            
            this.messagesView = new StreamMessagesView({collection: options.messages});
            this.inputView = new StreamInputView({messages: options.messages});
        },
        
        render: function() {
            this.$el.append(this.messagesView.render().el);
            this.$el.append(this.inputView.render().el);
            
            return this;
        },
    });
    
})(window.App);