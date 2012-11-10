(function(app) {
    
    var File = app.File = Backbone.Model.extend({
        
    });
    
    var Files = app.Files = Backbone.Collection.extend({
        model: File 
    });
    
    var Message = app.Message = Backbone.Model.extend({
        
    });
    
    var Messages = app.Messages = Backbone.Collection.extend({
        model: Message
    });
    
    var User = app.User = Backbone.Model.extend({
         
    });
    
    var Users = app.Users = Backbone.Collection.extend({
        model: User
    })
})(window.App);