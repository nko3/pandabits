(function(app) {
    
    var File = app.File = Backbone.Model.extend({
        
    });
    
    var Files = app.Files = Backbone.Collection.extend({
        model: File 
    });
    
    var Breakpoint = app.Breakpoint = Backbone.Model.extend({
        
    });
    
    var Breakpoints = app.Breakpoints = Backbone.Collection.extend({
        model: Breakpoint 
    });
    
    var Command = app.Command = Backbone.Model.extend({
        
    });
    
    var Commands = app.Commands = Backbone.Collection.extend({
        model: Command 
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