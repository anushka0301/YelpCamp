const campground = require("./models/campground");
var express              =require("express"),
    app                  =express(),
    bodyParser           =require("body-parser"),
    mongoose             =require("mongoose"),
    flash                =require("connect-flash"),
    passport             =require("passport"),
    localStrategy        =require("passport-local"),
    passportLocalMongoose=require("passport-local-mongoose"),
    Campground           =require("./models/campground"),
    Comment              =require("./models/comments"),
    User                 =require("./models/user"),
    methodOverride       =require("method-override");

//mongoose.connect("mongodb://localhost:27017/yelpcamp", {useNewUrlParser:true, useUnifiedTopology:true, useFindAndModify:false});
mongoose.connect("mongodb+srv://user:password@cluster0.xkswv.mongodb.net/yelpcamp?retryWrites=true&w=majority", {useNewUrlParser:true, useUnifiedTopology:true, useFindAndModify:false});

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended:true}));
app.use(require("express-session")({
    secret: "Secrettexthere",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()))
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(methodOverride("_method"));
app.set("view engine", "ejs");
app.use(flash());

app.use(function(req,res,next){
    res.locals.currentUser=req.user;
    res.locals.success=req.flash("success");
    res.locals.error=req.flash("error");
    next();
})

//==========CAMPGROUNDS================================================================================

//LandingPage
app.get("/", function(req,res){
    res.render("landing");
})

//Index
app.get("/campgrounds", function(req,res){
    Campground.find({}, function(err,campgrounds){
        if(err)
            console.log(err)
        else
            res.render("campgrounds/campgrounds", {campgrounds:campgrounds});
    })    
})

//AddNewCampgroundForm
app.get("/campgrounds/new",isLoggedIn, function(req,res){
    res.render("campgrounds/new");
})

//AddNewCampground
app.post("/campgrounds",isLoggedIn, function(req,res){
    var name=req.body.name;
    var image=req.body.image;
    var description=req.body.description;
    var price=req.body.price;
    var author={
        id:req.user._id,
        username:req.user.username
    } 
    var newCamp={name:name, image:image, description:description, price:price, author:author}  
    Campground.create(newCamp, function(err, newlyCreated){
        if(err)
            console.log(err);
        else{
            req.flash("success","Campground added! Thank you for your contribution.");
            res.redirect("/campgrounds");
        }
            
    })
})

//Show
app.get("/campgrounds/:id", function(req,res){
    Campground.findById(req.params.id).populate("comments").exec(function(err, found){
        if(err)
            console.log();
        else
            res.render("campgrounds/show", {campground:found});
    })
})

//EditCampgroundForm
app.get("/campgrounds/:id/edit",checkCampgroundOwnership, function(req,res){
    Campground.findById(req.params.id, function(err, found){
            res.render("campgrounds/edit", {campground:found});
    })
})

//UpdateCampround
app.put("/campgrounds/:id",checkCampgroundOwnership, function(req,res){
    Campground.findByIdAndUpdate(req.params.id, req.body.camp, function(){
        res.redirect("/campgrounds/"+req.params.id);
    })
})

//DeleteCampground
app.delete("/campgrounds/:id",checkCampgroundOwnership, function(req,res){
    Campground.findByIdAndRemove(req.params.id, function(){
        res.redirect("/campgrounds");
    })
})

app.get("/about", function(req,res){
    res.render("about");
})

//============COMMENTS================================================================================

//AddNewCommentForm
app.get("/campgrounds/:id/comments/new",isLoggedIn, function(req,res){
    Campground.findById(req.params.id, function(err, campground){
        if(err)
            console.log(err);
        else
            res.render("comments/new", {campground:campground})
    })
})

//AddNewComment
app.post("/campgrounds/:id/comments", function(req,res){
    Campground.findById(req.params.id, function(err, campground){
        if(err)
            console.log(err);
        else{
            Comment.create(req.body.comment, function(err, comment){
                if(err)
                    console.log(err);
                else{
                    comment.author.id=req.user._id;
                    comment.author.username=req.user.username;
                    comment.save();
                    campground.comments.push(comment);
                    campground.save();
                    req.flash("success", "Thank you for your feedback!");
                    res.redirect("/campgrounds/"+campground._id);
                }
            })
        }      
    })
})

//EditCommentForm
app.get("/campgrounds/:id/comments/:comment_id/edit",checkCommentOwnership, function(req,res){
    Campground.findById(req.params.id, function(err, campground){
        if(err)
            console.log(err);
        else{
            Comment.findById(req.params.comment_id, function(err,comment){
                if(err)
                    res.redirect("back");
                else
                    res.render("comments/edit", {campground:campground, comment:comment})
            })
        }
    })
})

//UpdateComment
app.put("/campgrounds/:id/comments/:comment_id",checkCommentOwnership, function(req,res){
    Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, comment){
        if(err)
            res.redirect("back");
        else{
            res.redirect("/campgrounds/"+req.params.id);
        }
    })
})

app.delete("/campgrounds/:id/comments/:comment_id",checkCommentOwnership, function(req,res){
    Comment.findByIdAndRemove(req.params.comment_id, function(){
        req.flash("success", "Comment deleted!");
        res.redirect("/campgrounds/"+req.params.id);
    })
})
    

//=========AUTHENTICATION============================================================================

//RegisterForm
app.get("/register", function(req,res){
    res.render("register");
})

//Register
app.post("/register", function(req,res){
    var newUser=new User({username: req.body.username});
    User.register(newUser, req.body.password, function(err, user){
        if(err){
            req.flash("error", err.message);
            res.redirect("register");
        }
        passport.authenticate("local")(req,res,function(){
            req.flash("success", "Hi! Welcome to Yelpcamp, "+user.username+".");
            res.redirect("/campgrounds");
        })
    })
})

//LoginForm
app.get("/login", function(req,res){
    res.render("login");
})

//Login
app.post("/login", passport.authenticate("local",{
    successRedirect: "/campgrounds",
    failureRedirect: "/login"
}), function(req,res){
})

//Logout
app.get("/logout", function(req,res){
    req.logout();
    req.flash("success", "Succesfully logged out!")
    res.redirect("/campgrounds");
})

//============MIDDLEWARES========================================================================

function isLoggedIn(req,res,next){
    if(req.isAuthenticated()){
        return next();
    }
    else{
        req.flash("error", "Please login first!");
        res.redirect("/login");
    }
}

function checkCampgroundOwnership(req,res,next){
    if(req.isAuthenticated()){
        Campground.findById(req.params.id, function(err, found){
            if(err)
                res.redirect("back");
            else{
                if(found.author.id.equals(req.user._id))
                    next();
                else{
                    req.flash("error", "You are not authorized to do that!");
                    res.redirect("back");
                }
            }
        })
    }
    else{
        res.redirect("back");
    }
}

function checkCommentOwnership(req,res,next){
    if(req.isAuthenticated()){
        Comment.findById(req.params.comment_id, function(err, found){
            if(err)
                res.redirect("back");
            else{
                if(found.author.id.equals(req.user._id))
                    next();
                else
                {
                    req.flash("error", "You are not authorized to do that!");
                    res.redirect("back");
                }
            }
        })
    }
    else{
        res.redirect("back");
    }
}

app.listen(process.env.PORT || 3000, function(){
    console.log("YelpCamp server has started!");
})