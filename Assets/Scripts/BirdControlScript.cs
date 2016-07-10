using UnityEngine;
using System.Collections;
using System.Collections.Generic;
using UnityEngine.SceneManagement;

public class BirdControlScript : MonoBehaviour {

	public float speed = 4.0f;
	public float rotationSpeed = 1.0f;
	public float enemyDistanceRadius = 1.5f;

	public static List<BirdControlScript> BirdList = new List<BirdControlScript>();

	private GameObject player;
	public bool alive = true;

	private Bounds levelBounds;

	// Use this for initialization
	void Start () {
		player = GameObject.Find ("plane");
		BirdList.Add (this);
		levelBounds = GameObject.Find ("SkySceneControl").GetComponent<SkySceneControl> ().levelBounds;
	}

	// Update is called once per frame
	void Update () {
		if (alive) {
			Vector3 vectorToTarget = player.transform.position - transform.position;
			float angle = Mathf.Atan2 (vectorToTarget.y, vectorToTarget.x) * Mathf.Rad2Deg;
			Quaternion q = Quaternion.AngleAxis (angle, Vector3.forward);
			transform.rotation = Quaternion.Slerp (transform.rotation, q, Time.deltaTime * rotationSpeed);

			//get a factor for all of the nearby enemies to apply to the position
			Vector3 v2 = rule2 (this);

			transform.position += (transform.right + v2) * speed * Time.deltaTime;
			if (!levelBounds.Contains (transform.position)) {
				transform.position = levelBounds.ClosestPoint (transform.position);
			}
		}

		if (transform.position.y <= -30) {
			Destroy (gameObject);
		}

		if (alive == true && 90f < transform.eulerAngles.z && transform.eulerAngles.z < 269f) {
			gameObject.GetComponent<SpriteRenderer> ().flipY = true;
		} else {
			gameObject.GetComponent<SpriteRenderer> ().flipY = false;
		}
	}

	void OnDestroy(){
		BirdList.Remove (this);
	}
		
	void OnTriggerEnter2D(Collider2D coll){
		if (coll.gameObject.name == "plane") {
			Debug.Log ("plane collision");
			//game over
			SceneManager.LoadScene("Title");
			Globals.inGame = false;
		}
	}

	private Vector3 rule2(BirdControlScript ej)
	{
		Vector3 center = Vector3.zero;

		for(int j = 0; j < BirdList.Count; j++)
		{
			BirdControlScript e = BirdList[j];

			float enemyDistance = Vector3.Distance (ej.transform.position, e.transform.position);

			if(e != ej && enemyDistance <= enemyDistanceRadius)
			{
				center = center - (e.transform.position - ej.transform.position);
			}
		}

		return center * 0.5f;
	}

	public void hit(Vector3 sourcePoint){
		alive = false;
		Vector2 sourceVector = ((Vector2)transform.position - (Vector2)sourcePoint) * 50f;
		gameObject.GetComponent<Rigidbody2D> ().isKinematic = false;
		gameObject.GetComponent<Collider2D> ().enabled = false;
		gameObject.GetComponent<Rigidbody2D> ().angularVelocity = Random.Range (100f, 400f) * Mathf.Sign( (float)Random.Range (-1, 1));
		gameObject.GetComponent<Rigidbody2D> ().AddForce(sourceVector);
		BirdList.Remove (this);

		Globals.score += 25 * Globals.scoreMultiplier;
	}
}
