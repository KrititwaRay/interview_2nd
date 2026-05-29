require("dotenv/config");
const express = require("express");
const OpenAI = require('openai');

const app = express();
app.use(express.json())

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.supabaseUrl, process.env.supabaseKey);


const client = new OpenAI({
    apiKey: process.env.OPENAI_KEY
});


app.post('/api/notes', async (req, res) => {

    try {
        const { user_id, content } = req.body;

        const { data, error } = await supabase.from("content").insert({
            user_id,
            content
        }).select();

        if (error) {
            return res.status(400).json({
                status: false,
                error: error
            })
        }


        const response = await client.responses.create({
            model: 'gpt-5.5',
            instructions: 'Create a summery on this.',
            input: content,
        });

        const response_data = response.output_text;


        const { updated_data, update_error } = await supabase
            .from('content')
            .update({ summary: response_data })
            .eq('id', data[0].id)
            .select();


        if (update_error) {

            const response = await supabase
                .from('content')
                .delete()
                .eq('id', data[0].id);

            return res.status(400).json({ message: "Something Went wring." })
        }



        return res.status(201).json({ status: true, data: updated_data });


    } catch (error) {
        return res.status(500).json({ status: false, message: "Something Went wring. Please try again." })
    }


})




app.get('/api/notes/:user_id', async (req, res) => {

    try {
        const { user_id } = req.params

        const { data, error } = await supabase
            .from('content')
            .select('*')
            .eq('user_id', user_id)
            .order('created_at', { ascending: false });


        if (data.length <= 0) {
            return res.status(400).json({ message: "Please provide valid id." })
        }


        if (error) {
            return res.status(400).json({
                status: false,
                error: error
            })
        }

        return res.status(200).json({
            message: "Data fetched successfully.",
            data: data
        })

    } catch (error) {
        return res.status(500).json({ status: false, message: "Something Went wring. Please try again." })
    }

})



const PORT = process.env.PORT
app.listen(PORT, () => {
    console.log(`Server is lintening on `, PORT)
})