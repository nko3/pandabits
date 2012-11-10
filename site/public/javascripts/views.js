(function(app) {
    
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
        className: "file-tabs",
        
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
            var view = this.views[file.get("id")] = new FileView({mode: file});
            
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
            console.log(tabs);
            if (tabs.length === 0) {
                this.$(".nav li").first().addClass("active");
                this.$(".tab-content div.tab-pane").first().addClass("active");
            }
        }
    },{
        template: ' \
<ul class="nav nav-tabs"> \
<% _.each(infos, function(info) { %> \
  <li><a href="#file-tab-content<%= info.id %>" data-file="<%= info.id %>" data-toggle="tab"><%= info.path %></a></li> \
<% }) %> \
</ul>  \
<div class="tab-content"></div> \
'
    });
    
    var StreamInputView = app.StreamInputView = Backbone.View.extend({
        initialize: function() {
            
        },
        
        render: function() {
            this.$el.html(_.template(StreamInputView.template));
            
            return this;
        },
        
        events: {
            "click .submit-button": "onSubmitClicked"
        },
        
        onSubmitClicked: function(e) {
            console.log("CLICKED");
        }
    },{
        template: ' \
<input class="chat-input input-xlarge"> \
<button type="submit" class="submit-button btn">Go</button> \
'
    });
    
    var StreamMessageView = app.StreamMessageView = Backbone.View.extend({
        className: "message-box",
        
        initialize: function() {
            this.model.on("change:content", this.onContentChanged, this);
        },
        
        render: function() {
            this.$el.html(_.template(StreamMessageView.template, this.model.toJSON()));
            
            return this;
        },
        
        onContentChanged: function() {
            this.$(".message-content").text(this.model.get("content"));
        }
    },{
        template: ' \
<div class="message-header"> \
    <span class="message-user"><%= user %></span> \
    <span class="message-time"><%= time %></span> \
</div> \
<div class="message-content"> \
    <%= content %> \
</div> \
'
    });
    
    var StreamMessagesView = app.StreamMessagesView = Backbone.View.extend({
        initialize: function() {
            
        },
        
        render: function() {
            return this;
        }
    });
    
    var StreamView = app.StreamView = Backbone.View.extend({
        className: "stream-window"
        
        initialize: function() {
            
            this.messages = new StreamMessagesView({collection: options.messages});
            this.input = new StreamInputView();    
        },
        
        render: function() {
        
        },
    });
    
})(window.App);