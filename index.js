const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')
const bodyParser = require('body-parser');

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
// prepare the database 
//1.connect to the data base
mongoose.set('strictQuery', false);
const url = process.env.DB;
mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true }, (err) => {
  if (err) return (console.log(err))
  console.log("Connected to DB")
});
//2. Prepare Schemas 
const ExerciseSchema = mongoose.Schema({
  username: String,
  description: { type: String, required: true },
  duration: { type: Number, min: 1, required: true },
  date: { type: Date },
  userId: String
});

const userSchema = mongoose.Schema({
  username: {
    type: String,
    unique: true
  }
}, { versionKey: false })


//3.Models
const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', ExerciseSchema)
//Url config
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//routes: 
//1. POST /api/users username
//create new user
app.post('/api/users', async (req, res) => {
  const input = req.body.username;

  const founduser = await User.findOne({ username: input });
  if (founduser) {
    res.json({ username: founduser['username'] });
  }

  const newUser = new User({
    username: input
  }).save((err, data) => {
    if (err) return res.json(err)
    res.json(data);
  })

})
//get all users 
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();

    res.json(users);
  } catch (err) {
    res.json(err)
  }
})

///api/users/:_id/exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  if (req.params._id === '0') {
    return res.json({ error: '_id is required' });
  }

  if (req.body.description === '') {
    return res.json({ error: 'description is required' });
  }

  if (req.body.duration === '') {
    return res.json({ error: 'duration is required' });
  }

  let userId = req.params._id;
  let description = req.body.description;
  let duration = parseInt(req.body.duration);
  let date = (req.body.date !== undefined ? new Date(req.body.date) : new Date());

  if (isNaN(duration)) {
    return res.json({ error: 'duration is not a number' });
  }

  if (date == 'Invalid Date') {
    return res.json({ error: 'date is invalid' });
  }
  User.findById(userId, (err, data) => {
    if (!err && data !== null) {
      let newExercise = new Exercise({
        userId: userId,
        description: description,
        duration: duration,
        date: date
      });
      newExercise.save((err2, data2) => {
        if (!err2) {
          return res.json({
            _id: data['_id'],
            username: data['username'],
            description: data2['description'],
            duration: data2['duration'],
            date: new Date(data2['date']).toDateString()
          })
        }
      })
    }
    else {
      return res.json({ error: 'Ooops! user not found' });
    }
  });

})
app.get('/api/users/:_id/exercises', (req, res) => {
  res.redirect('/api/users' + req.params._id + '/logs')
})

/*app.get('/api/users/:_id/logs', async (req, res) => {
  //find the user name by id
  const iduser = req.params._id;
  const findname = await User.findById(iduser);
  const namefound = findname.username;
  //find the user excerices by name 
  const exercices = await Exercise.find({ username: namefound })

  res.json(exercices)
})*/
app.get('/api/users/:_id/logs', function (req, res) {
	let userId = req.params._id;
	let findConditions = { userId: userId };

	if (
		(req.query.from !== undefined && req.query.from !== '') || (req.query.to !== undefined && req.query.to !== '')) {
    
		findConditions.date = {};

		if (req.query.from !== undefined && req.query.from !== '') {
			findConditions.date.$gte = new Date(req.query.from);
		}

		if (findConditions.date.$gte == 'Invalid Date') {
			return res.json({ error: 'from date is invalid' });
		}

		if (req.query.to !== undefined && req.query.to !== '') {
			findConditions.date.$lte = new Date(req.query.to);
		}

		if (findConditions.date.$lte == 'Invalid Date') {
			return res.json({ error: 'to date is invalid' });
		}
	}

	let limit = (req.query.limit !== undefined ? parseInt(req.query.limit) : 0);

	if (isNaN(limit)) {
		return res.json({ error: 'limit is not a number' });
	}

	User.findById(userId, function (err, data) {
		if (!err && data !== null) {
			Exercise.find(findConditions).sort({ date: 'asc' }).limit(limit).exec(function (err2, data2) {
				if (!err2) {
					return res.json({
            username: data['username'],
             count: data2.length,
						_id: data['_id'],
           
						
						log: data2.map(function (e) {
							return {
								description: e.description,
								duration: e.duration,
								date: new Date(e.date).toDateString()
							};
						})
						
					});
				}
			});
		} else {
			return res.json({ error: 'user not found' });
		}
	});
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
